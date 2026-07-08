<?php

namespace App\Http\Controllers\Payment;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class VodafoneCashController extends Controller
{
    public function __construct(
        private WalletService $walletService
    ) {}

    public function webhook(Request $request): JsonResponse
    {
        // 🚀 1. درع الحماية: التأكد من أن الطلب قادم من بوابتك فقط!
        // يجب أن تضع VODAFONE_CASH_SECRET_KEY في ملف .env
        $secretKey = config('services.vodafone_cash.secret_key', env('VODAFONE_CASH_SECRET_KEY'));
        $providedSignature = $request->header('x-vodafone-signature');

        if ($secretKey && $providedSignature !== $secretKey) {
            Log::critical('Vodafone Cash Spoofing Attempt!', ['ip' => $request->ip()]);

            return ApiResponse::error('Unauthorized', 401);
        }

        $payload = $request->all();
        Log::info('Vodafone Cash webhook received', $payload);

        $reference = $payload['reference'] ?? $payload['merchantReference'] ?? null;
        if (! $reference) {
            return ApiResponse::error('Missing reference', 400);
        }

        $transaction = $this->walletService->findByReference($reference);
        if (! $transaction) {
            return ApiResponse::error('Transaction not found', 404);
        }

        if ($transaction->status === 'completed') {
            return ApiResponse::success(['message' => 'Already processed']);
        }

        $status = $payload['status'] ?? '';
        if ($status === 'SUCCESS' || $status === 'success' || $status === 'completed') {
            // 🚀 2. حماية المبلغ: التأكد أنه دفع المبلغ كاملاً (إذا كانت بوابتك ترسل المبلغ المدفوع)
            $paidAmount = $payload['amount'] ?? $transaction->amount;
            if ($paidAmount < $transaction->amount) {
                return ApiResponse::error('Amount mismatch', 400);
            }

            $this->walletService->completeTopUp($transaction);

            return ApiResponse::success(['message' => 'Payment successful']);
        }

        $this->walletService->cancelTransaction($transaction);

        return ApiResponse::error('Payment failed', 400);
    }
}
