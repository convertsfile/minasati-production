<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\WalletTopupRequest;
use App\Services\NotificationService;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AdminWalletController extends Controller
{
    public function __construct(
        private WalletService $walletService
    ) {
    }

    public function pendingTopups(Request $request): JsonResponse
    {
        $limit = $request->integer('limit', 20);
        $status = $request->input('status', 'pending');

        $query = WalletTopupRequest::with(['user', 'paymentNumber', 'reviewer'])
            ->orderBy('created_at', 'desc');

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $requests = $query->paginate($limit);

        // تنسيق البيانات لتتطابق مع معايير الـ Frontend (CamelCase)
        $requests->getCollection()->transform(fn($req) => $this->formatRequest($req));

        return ApiResponse::paginated($requests, 'تم جلب طلبات الشحن بنجاح');
    }

    public function topupDetail(int $id): JsonResponse
    {
        $request = WalletTopupRequest::with(['user', 'paymentNumber', 'reviewer'])->find($id);

        if (!$request) {
            return ApiResponse::error('طلب الشحن غير موجود', 'ERR_NOT_FOUND', 404);
        }

        return ApiResponse::success($this->formatRequest($request), 'تم جلب تفاصيل الطلب');
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'verified_amount' => 'required|numeric|min:1', // 🚀 حماية إضافية للأرقام
            'admin_notes' => 'nullable|string',
        ]);

        $topupRequest = WalletTopupRequest::with('user')->find($id);

        if (!$topupRequest)
            return ApiResponse::error('الطلب غير موجود', 'ERR_NOT_FOUND', 404);
        if ($topupRequest->status !== 'pending')
            return ApiResponse::error('تمت معالجة هذا الطلب مسبقاً', 'ERR_ALREADY_PROCESSED', 400);

        try {
            $transaction = DB::transaction(function () use ($topupRequest, $validated, $request) {

                // 🚀 السحر هنا: حذفنا تحديث الـ (status) لكي لا تصطدم بالـ WalletService
                $topupRequest->update([
                    'verified_amount' => $validated['verified_amount'],
                    'admin_notes' => $validated['admin_notes'] ?? null,
                    'reviewed_by' => $request->user()->id,
                    'reviewed_at' => now(),
                ]);

                // نمرر الطلب للسيرفيس وهو ما زال "pending" لكي توافق عليه بنفسها وتضيف الرصيد
                return $this->walletService->completeTopupFromRequest($topupRequest);
            }, 3);

            // إرسال الإشعار بعد انتهاء المعاملة
            try {
                NotificationService::notifyWalletTopup($topupRequest->user, 'approved', $validated['verified_amount'], $topupRequest->admin_notes);
            } catch (\Exception $e) {
                Log::warning('Wallet notification failed: ' . $e->getMessage());
            }

            return ApiResponse::success([
                'requestId' => $topupRequest->id,
                'status' => 'approved',
                'transactionId' => $transaction->id ?? null,
                'amountCredited' => $transaction->amount ?? $validated['verified_amount'],
            ], 'تمت الموافقة على طلب الشحن وإضافة الرصيد للطالب بنجاح.');

        } catch (\Exception $e) {
            Log::error('Failed to approve topup', ['request_id' => $topupRequest->id, 'error' => $e->getMessage()]);
            return ApiResponse::error('فشل في معالجة طلب الموافقة: ' . $e->getMessage(), 'ERR_APPROVE_FAILED', 500);
        }
    }

    public function adjustAndApprove(Request $request, int $id): JsonResponse
    {
        // 🚀 توحيد اسم الحقل هنا (admin_notes بدلاً من notes) ليتطابق مع الفرونت إند
        $validated = $request->validate([
            'verified_amount' => 'required|numeric|min:1',
            'admin_notes' => 'nullable|string|max:500',
        ]);

        $topupRequest = WalletTopupRequest::with('user')->find($id);

        if (!$topupRequest)
            return ApiResponse::error('الطلب غير موجود', 'ERR_NOT_FOUND', 404);
        if (!in_array($topupRequest->status, ['pending', 'amount_mismatch'])) {
            return ApiResponse::error('تمت معالجة هذا الطلب مسبقاً', 'ERR_ALREADY_PROCESSED', 400);
        }

        $verifiedAmount = $validated['verified_amount'];

        try {
            $transaction = DB::transaction(function () use ($topupRequest, $verifiedAmount, $request, $validated) {

                // 🚀 حذفنا تحديث الحالة (status) لتمريرها بسلام
                $topupRequest->update([
                    'verified_amount' => $verifiedAmount,
                    'reviewed_by' => $request->user()->id,
                    'reviewed_at' => now(),
                    'admin_notes' => $validated['admin_notes'] ?? 'تم تعديل المبلغ والموافقة إدارياً',
                ]);

                return $this->walletService->completeTopupFromRequest($topupRequest);
            }, 3);

            try {
                NotificationService::notifyWalletTopup($topupRequest->user, 'approved', $verifiedAmount, $topupRequest->admin_notes);
            } catch (\Exception $e) {
                Log::warning('Wallet notification failed: ' . $e->getMessage());
            }

            return ApiResponse::success([
                'requestId' => $topupRequest->id,
                'status' => 'approved',
                'originalAmount' => $topupRequest->amount,
                'verifiedAmount' => $verifiedAmount,
                'transactionId' => $transaction->id ?? null,
                'amountCredited' => $transaction->amount ?? $verifiedAmount,
            ], 'تم تعديل المبلغ والموافقة على الشحن بنجاح.');

        } catch (\Exception $e) {
            Log::error('Failed to adjust and approve topup', ['request_id' => $topupRequest->id, 'error' => $e->getMessage()]);
            return ApiResponse::error('فشل في التعديل: ' . $e->getMessage(), 'ERR_ADJUST_FAILED', 500);
        }
    }

    public function decline(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'admin_notes' => 'required|string|max:500',
        ]);

        $topupRequest = WalletTopupRequest::with('user')->find($id);

        if (!$topupRequest)
            return ApiResponse::error('الطلب غير موجود', 'ERR_NOT_FOUND', 404);
        if (!in_array($topupRequest->status, ['pending', 'amount_mismatch'])) {
            return ApiResponse::error('تمت معالجة هذا الطلب مسبقاً', 'ERR_ALREADY_PROCESSED', 400);
        }

        // هنا نحدث الحالة لـ declined مباشرة لأنه لا يوجد تحويل مالي
        $topupRequest->update([
            'status' => 'declined',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'admin_notes' => $validated['admin_notes'],
        ]);

        try {
            NotificationService::notifyWalletTopup($topupRequest->user, 'declined', 0, $validated['admin_notes']);
        } catch (\Exception $e) {
            Log::warning('Decline notification failed: ' . $e->getMessage());
        }

        return ApiResponse::success([
            'requestId' => $topupRequest->id,
            'status' => 'declined',
        ], 'تم رفض الطلب بنجاح وإرسال إشعار للطالب.');
    }

    public function stats(): JsonResponse
    {
        $pending = WalletTopupRequest::where('status', 'pending')->count();
        $approved = WalletTopupRequest::where('status', 'approved')->count();
        $declined = WalletTopupRequest::where('status', 'declined')->count();
        $amountMismatch = WalletTopupRequest::where('status', 'amount_mismatch')->count();

        $totalApproved = WalletTopupRequest::where('status', 'approved')
            ->sum(DB::raw('COALESCE(verified_amount, amount)'));

        return ApiResponse::success([
            'pending' => $pending,
            'approved' => $approved,
            'declined' => $declined,
            'amountMismatch' => $amountMismatch,
            'totalApprovedAmount' => (int) $totalApproved,
        ], 'تم جلب الإحصائيات');
    }

    private function formatRequest(WalletTopupRequest $req): array
    {
        return [
            'id' => $req->id,
            'amount' => $req->amount,
            'verifiedAmount' => $req->verified_amount,
            'finalAmount' => $req->getFinalAmount(),
            'paymentMethod' => $req->payment_method,
            'status' => $req->status,
            'adminNotes' => $req->admin_notes,
            'proofImageUrl' => $req->proof_image_url,
            'createdAt' => $req->created_at->format('Y-m-d H:i:s'),
            'reviewedAt' => $req->reviewed_at?->format('Y-m-d H:i:s'),
            'student' => [
                'id' => $req->user->id,
                'fullName' => $req->user->full_name,
                'phone' => $req->user->phone,
                'parentPhone' => $req->user->parent_phone,
                'email' => $req->user->email,
                'walletBalance' => $req->user->wallet_balance,
            ],
            'paymentNumber' => $req->paymentNumber ? [
                'number' => $req->paymentNumber->number,
                'provider' => $req->paymentNumber->provider,
            ] : null,
            'reviewer' => $req->reviewer ? [
                'id' => $req->reviewer->id,
                'fullName' => $req->reviewer->full_name,
            ] : null,
        ];
    }
}