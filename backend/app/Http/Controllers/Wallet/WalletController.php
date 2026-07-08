<?php

namespace App\Http\Controllers\Wallet;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Http\Resources\WalletTransactionResource;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WalletController extends Controller
{
    public function __construct(
        private WalletService $walletService
    ) {
    }

    public function balance(Request $request): JsonResponse
    {
        $balance = $this->walletService->getBalance($request->user());

        return ApiResponse::success([
            'balance' => $balance,
        ], 'تم جلب الرصيد بنجاح');
    }

    public function transactions(Request $request): JsonResponse
    {
        $limit = $request->integer('limit', 20);
        $offset = $request->integer('offset', 0);

        $transactions = $this->walletService->getTransactions($request->user(), $limit, $offset);

        // 🚀 الحل الجذري: تم إزالة دالة resolve() التي كانت تكسر هيكلة الـ JSON
        // سنمرر الـ Resource مباشرة ليقوم لارافيل بتغليفه بشكل قياسي ومقروء للفرونت إند
        return ApiResponse::success(
            WalletTransactionResource::collection($transactions),
            'تم جلب سجل المعاملات'
        );
    }

    public function createTopUp(Request $request): JsonResponse
    {
        $request->validate([
            'amount' => 'required|integer|min:1',
            'payment_method' => 'required|in:fawry,credit_card',
        ]);

        $transaction = $this->walletService->createPendingTopUp(
            $request->user(),
            $request->integer('amount'),
            $request->input('payment_method'),
            'TXN-' . uniqid() . '-' . time()
        );

        return ApiResponse::success(
            new WalletTransactionResource($transaction),
            'تم إنشاء طلب الدفع الآلي',
            201
        );
    }

    public function webhook(Request $request): JsonResponse
    {
        $payload = $request->all();

        // 🚨 يجب التحقق من صحة التوقيع (HMAC Signature) القادم من بوابة الدفع هنا

        $reference = $payload['reference'] ?? $payload['merchantReference'] ?? null;

        if (!$reference) {
            return ApiResponse::error('معرف العملية مفقود', 'ERR_MISSING_REF', 400);
        }

        $transaction = $this->walletService->findByReference($reference);

        if (!$transaction) {
            return ApiResponse::error('العملية غير موجودة', 'ERR_TXN_NOT_FOUND', 404);
        }

        if ($transaction->status === 'completed') {
            return ApiResponse::success(null, 'تمت معالجة الطلب مسبقاً');
        }

        $status = $payload['status'] ?? $payload['paymentStatus'] ?? null;
        $status = strtolower($status);

        if (in_array($status, ['success', 'completed', 'paid'])) {
            $this->walletService->completeTopUp($transaction);
            Log::info("Webhook: Auto-Topup completed for TXN {$reference}");

            return ApiResponse::success(null, 'تم إتمام عملية الدفع بنجاح');
        }

        $this->walletService->cancelTransaction($transaction);
        Log::warning("Webhook: Payment failed or cancelled for TXN {$reference}");

        return ApiResponse::error('فشلت عملية الدفع', 'ERR_PAYMENT_FAILED', 400);
    }
}