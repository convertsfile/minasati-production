<?php

namespace App\Http\Controllers\Wallet;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\WalletTopupRequest;
use App\Services\FileUploadService;
use App\Services\PaymentNumberService;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WalletTopupController extends Controller
{
    public function __construct(
        private WalletService $walletService,
        private PaymentNumberService $paymentNumberService,
        private FileUploadService $fileUploadService
    ) {
    }

    public function initiate(Request $request): JsonResponse
    {
        $request->validate([
            'provider' => 'required|in:instapay,vodafone_cash',
        ]);

        $provider = $request->input('provider');

        // 🚀 الإصلاح المعماري: تم حذف المتغير $user لتتوافق مع التوزيع العالمي للرصيد
        $paymentNumber = $this->paymentNumberService->getNextNumber($provider);

        if (!$paymentNumber) {
            return ApiResponse::error(
                'عذراً، لا توجد أرقام دفع متاحة حالياً. يرجى المحاولة لاحقاً.',
                'ERR_NO_PAYMENT_NUMBER',
                400
            );
        }

        return ApiResponse::success([
            'provider' => $provider,
            'paymentNumber' => $paymentNumber->number,
            'instructions' => $this->getInstructions($provider),
        ], 'تم جلب رقم الدفع بنجاح');
    }

    public function submit(Request $request): JsonResponse
    {
        // 💡 ملاحظة احترافية: يُفضل مستقبلاً نقل هذا الـ Validate إلى FormRequest منفصل
        $request->validate([
            'provider' => 'required|in:instapay,vodafone_cash',
            'amount' => 'required|integer|min:1',
            'proof_image' => 'required|file|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $user = $request->user();
        $provider = $request->input('provider');
        $amount = $request->integer('amount');

        // 🚀 الإصلاح المعماري للـ $user هنا أيضاً
        $paymentNumber = $this->paymentNumberService->getNextNumber($provider);

        if (!$paymentNumber) {
            return ApiResponse::error(
                'لا توجد أرقام دفع متاحة حالياً. يرجى المحاولة لاحقاً.',
                'ERR_NO_PAYMENT_NUMBER',
                400
            );
        }

        // رفع صورة الإثبات بأمان
        $proofImage = $request->file('proof_image');
        $uploadResult = $this->fileUploadService->upload($proofImage, 'wallet/topups');

        if (!$uploadResult) {
            Log::error('Failed to upload proof image', ['user_id' => $user->id]);
            return ApiResponse::error('فشل في رفع صورة الإثبات. يرجى المحاولة مرة أخرى.', 'ERR_UPLOAD_FAILED', 500);
        }

        $topupRequest = WalletTopupRequest::create([
            'user_id' => $user->id,
            'payment_number_id' => $paymentNumber->id,
            'amount' => $amount,
            'payment_method' => $provider,
            'proof_image_url' => $uploadResult['url'],
            'status' => 'pending',
        ]);

        Log::info('Wallet topup request created', [
            'request_id' => $topupRequest->id,
            'user_id' => $user->id,
            'amount' => $amount,
        ]);

        return ApiResponse::success([
            'requestId' => $topupRequest->id,
            'status' => $topupRequest->status,
        ], 'تم إرسال طلب الشحن بنجاح. رصيدك قيد المراجعة وسيتوفر قريباً.', 201);
    }

    public function status(Request $request): JsonResponse
    {
        $pendingRequests = WalletTopupRequest::where('user_id', $request->user()->id)
            ->whereIn('status', ['pending', 'amount_mismatch'])
            ->orderBy('created_at', 'desc')
            ->get();

        return ApiResponse::success([
            'pendingRequests' => $pendingRequests->map(fn($req) => [
                'id' => $req->id,
                'amount' => $req->amount,
                'verifiedAmount' => $req->verified_amount,
                'paymentMethod' => $req->payment_method,
                'status' => $req->status,
                'adminNotes' => $req->admin_notes,
                'createdAt' => $req->created_at->format('Y-m-d H:i:s'),
            ]),
        ], 'تم جلب حالة الطلبات');
    }

    public function history(Request $request): JsonResponse
    {
        $limit = $request->integer('limit', 10);

        $history = WalletTopupRequest::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->paginate($limit);

        // 🚀 استخدام الميثاق الصحيح للبيانات المجدولة (Paginated)
        return ApiResponse::paginated($history, 'تم جلب سجل الشحن بنجاح');
    }

    // 🚀 تعريب التعليمات لتناسب الطلاب وتحسين الـ UX
    private function getInstructions(string $provider): array
    {
        if ($provider === 'instapay') {
            return [
                'افتح تطبيق البنك الخاص بك أو تطبيق إنستاباي (InstaPay).',
                'قم بتحويل المبلغ المطلوب إلى الحساب الموضح أعلاه.',
                'التقط صورة (سكرين شوت) واضحة تؤكد نجاح عملية التحويل.',
                'قم برفع الصورة هنا كدليل لإثبات الدفع ليتم إضافة الرصيد.'
            ];
        }

        return [
            'افتح تطبيق أنا فودافون أو اطلب *9# من هاتفك.',
            'قم بتحويل المبلغ المطلوب إلى الرقم الموضح أعلاه.',
            'التقط صورة (سكرين شوت) لرسالة تأكيد التحويل التي وصلتك.',
            'قم برفع الصورة هنا كدليل لإثبات الدفع ليتم إضافة الرصيد.'
        ];
    }
}