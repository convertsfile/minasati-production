<?php

namespace App\Http\Controllers\Payment;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\Metrics\ApplicationMetrics;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class VodafoneCashController extends Controller
{
    /**
     * Maximum allowed clock skew (in seconds) between the Vodafone timestamp
     * we receive in the webhook and the server's current time. Protects
     * against replay attacks on captured PAID notifications.
     */
    private const REPLAY_WINDOW_SECONDS = 300;

    /**
     * Cache key prefix used to remember processed webhook IDs so a captured
     * PAID notification cannot be replayed inside the replay window.
     */
    private const NONCE_CACHE_PREFIX = 'vodafone_cash:webhook:nonce:';

    public function __construct(
        private WalletService $walletService,
        private ApplicationMetrics $metrics
    ) {}

    public function webhook(Request $request): JsonResponse
    {
        // SEC-CRIT-03: refuse to register the webhook in any non-local env
        // if the secret is missing entirely.
        $secretKey = (string) config('services.vodafone_cash.secret_key', env('VODAFONE_CASH_SECRET_KEY', ''));
        if ($secretKey === '' && ! app()->environment('local')) {
            Log::critical('Vodafone Cash webhook hit with empty VODAFONE_CASH_SECRET_KEY in non-local env — refusing.');
            $this->metrics->recordWebhook('vodafone_cash', 'config_error', 'misconfigured');
            return ApiResponse::error('Webhook misconfigured', 'ERR_WEBHOOK_MISCONFIGURED', 503);
        }

        $providedSignature = $request->header('x-vodafone-signature');
        $timestamp = (int) ($request->header('x-vodafone-timestamp') ?? $request->input('timestamp', 0));
        $eventId = (string) ($request->header('x-vodafone-event-id') ?? $request->input('eventId', $request->input('reference', '')));

        // Always log the attempt, even when it fails the secret check.
        Log::info('Vodafone Cash webhook received', $request->all());

        // Replay protection: the timestamp must be within the allowed window.
        if ($timestamp > 0) {
            $now = time();
            $skew = abs($now - $timestamp);
            if ($skew > self::REPLAY_WINDOW_SECONDS) {
                Log::warning('Vodafone Cash webhook rejected: timestamp outside replay window', [
                    'timestamp' => $timestamp,
                    'skew_seconds' => $skew,
                ]);
                $this->metrics->recordWebhook('vodafone_cash', 'topup', 'stale');
                return ApiResponse::error('Stale or out-of-window request', 'ERR_STALE_TIMESTAMP', 401);
            }
        }

        // Replay protection: dedupe on eventId.
        if ($eventId !== '') {
            $cacheKey = self::NONCE_CACHE_PREFIX . hash('sha256', $eventId);
            if (Cache::has($cacheKey)) {
                Log::warning('Vodafone Cash webhook replay detected (duplicate eventId)', ['eventId' => $eventId]);
                $this->metrics->recordWebhook('vodafone_cash', 'topup', 'duplicate');
                return ApiResponse::success(['message' => 'Already processed']);
            }
            Cache::put($cacheKey, 1, self::REPLAY_WINDOW_SECONDS);
        }

        // Compute the expected signature over the structured payload + timestamp.
        $expectedSignature = $this->generateSignature($request->all(), $timestamp, $secretKey);

        // Constant-time comparison. We do NOT skip the check when the secret
        // is missing — the SEC-CRIT-03 fix is to refuse the request above.
        if (! is_string($providedSignature) || ! hash_equals($expectedSignature, $providedSignature)) {
            Log::critical('Vodafone Cash Spoofing Attempt!', [
                'ip' => $request->ip(),
                'expected_prefix' => substr($expectedSignature, 0, 8),
                'received_prefix' => is_string($providedSignature) ? substr($providedSignature, 0, 8) : null,
            ]);

            $this->metrics->recordWebhook('vodafone_cash', 'topup', 'invalid_signature');
            return ApiResponse::error('Unauthorized', 'ERR_UNAUTHORIZED', 401);
        }

        $payload = $request->all();
        $reference = $payload['reference'] ?? $payload['merchantReference'] ?? null;
        if (! $reference) {
            return ApiResponse::error('Missing reference', 'ERR_MISSING_REFERENCE', 400);
        }

        $transaction = $this->walletService->findByReference($reference);
        if (! $transaction) {
            return ApiResponse::error('Transaction not found', 'ERR_TRANSACTION_NOT_FOUND', 404);
        }

        if ($transaction->status === 'completed') {
            $this->metrics->recordWebhook('vodafone_cash', 'topup', 'duplicate');
            return ApiResponse::success(['message' => 'Already processed']);
        }

        $status = $payload['status'] ?? '';
        if ($status === 'SUCCESS' || $status === 'success' || $status === 'completed') {
            // 🚀 2. حماية المبلغ: التأكد أنه دفع المبلغ كاملاً (إذا كانت بوابتك ترسل المبلغ المدفوع)
            $paidAmount = $payload['amount'] ?? $transaction->amount;
            if ($paidAmount < $transaction->amount) {
                $this->metrics->recordWebhook('vodafone_cash', 'topup', 'amount_mismatch');
                return ApiResponse::error('Amount mismatch', 'ERR_AMOUNT_MISMATCH', 400);
            }

            $this->walletService->completeTopUp($transaction);

            $this->metrics->recordWebhook('vodafone_cash', 'topup', 'processed');
            return ApiResponse::success(['message' => 'Payment successful']);
        }

        $this->walletService->cancelTransaction($transaction);

        $this->metrics->recordWebhook('vodafone_cash', 'topup', 'failed');
        return ApiResponse::error('Payment failed', 'ERR_PAYMENT_FAILED', 400);
    }

    /**
     * Build the canonical Vodafone Cash signature:
     *   sha256(merchantCode | reference | amount | status | timestamp, secret)
     *
     * The signed payload now includes the status and timestamp so a captured
     * PAID notification cannot be replayed as a different event, and the
     * comparison in webhook() uses hash_equals (constant-time).
     */
    private function generateSignature(array $payload, int $timestamp, string $secretKey): string
    {
        $merchantCode = (string) config('services.vodafone_cash.merchant_code', env('VODAFONE_CASH_MERCHANT_CODE', ''));

        $data = implode('|', [
            $merchantCode,
            (string) ($payload['reference'] ?? $payload['merchantReference'] ?? ''),
            (string) ($payload['amount'] ?? ''),
            (string) ($payload['status'] ?? ''),
            (string) ($timestamp ?: ($payload['timestamp'] ?? '')),
        ]);

        return hash_hmac('sha256', $data, $secretKey);
    }
}
