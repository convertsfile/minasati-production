<?php

namespace App\Http\Controllers\Payment;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class FawryController extends Controller
{
    public function __construct(
        private WalletService $walletService
    ) {}

    public function webhook(Request $request): JsonResponse
    {
        $signature = $request->header('fawry_signature');
        $payload = $request->all();

        Log::info('Fawry webhook received', $payload);

        $expectedSignature = $this->generateSignature($payload);
        if ($signature !== $expectedSignature) {
            Log::warning('Fawry signature verification failed', [
                'expected' => $expectedSignature,
                'received' => $signature,
            ]);

            return ApiResponse::error('Invalid signature', 401);
        }

        $reference = $payload['merchantReference'] ?? null;
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

        $paymentStatus = $payload['paymentStatus'] ?? '';
        if ($paymentStatus === 'PAID' || $paymentStatus === 'success') {
            $paidAmount = $payload['paymentAmount'] ?? 0;
            if ($paidAmount < $transaction->amount) {
                Log::critical("Fawry Amount Tampering: Expected {$transaction->amount}, got {$paidAmount}");

                return ApiResponse::error('Invalid payment amount', 400);
            }

            $this->walletService->completeTopUp($transaction);

            return ApiResponse::success(['message' => 'Payment successful']);
        }

        $this->walletService->cancelTransaction($transaction);

        return ApiResponse::error('Payment failed', 400);
    }

    private function generateSignature(array $payload): string
    {
        $merchantCode = config('services.fawry.merchant_code');
        $merchantSecret = config('services.fawry.merchant_secret');

        $data = $merchantCode.($payload['merchantReference'] ?? '').($payload['amount'] ?? '');

        return hash_hmac('sha256', $data, $merchantSecret);
    }
}
