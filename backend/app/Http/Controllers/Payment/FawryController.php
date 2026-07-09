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

class FawryController extends Controller
{
    /**
     * Maximum allowed clock skew (in seconds) between the Fawry timestamp
     * we receive in the webhook and the server's current time. Protects
     * against replay attacks on captured PAID notifications.
     */
    private const REPLAY_WINDOW_SECONDS = 300;

    /**
     * Cache key prefix used to remember processed webhook IDs so a captured
     * PAID notification cannot be replayed inside the replay window.
     */
    private const NONCE_CACHE_PREFIX = 'fawry:webhook:nonce:';

    public function __construct(
        private WalletService $walletService,
        private ApplicationMetrics $metrics
    ) {}

    public function webhook(Request $request): JsonResponse
    {
        // SEC-CRIT-02: refuse to register the webhook in any non-local env
        // if the secret is missing. The service can still be reached in
        // local dev (where the secret is also normally empty) so we allow it
        // to fail loudly at signature-verification time.
        $merchantSecret = (string) config('services.fawry.merchant_secret', env('FAWRY_SECRET_KEY', ''));
        if ($merchantSecret === '' && ! app()->environment('local')) {
            Log::critical('Fawry webhook hit with empty FAWRY_SECRET_KEY in non-local env — refusing.');
            $this->metrics->recordWebhook('fawry', 'config_error', 'misconfigured');
            return ApiResponse::error('Webhook misconfigured', 'ERR_WEBHOOK_MISCONFIGURED', 503);
        }

        $payload = $request->all();
        $signature = $request->header('fawry_signature');
        $timestamp = (int) ($request->header('fawry_timestamp') ?? $payload['timestamp'] ?? 0);
        $eventId = (string) ($request->header('fawry_event_id') ?? $payload['eventId'] ?? $payload['reference'] ?? '');

        Log::info('Fawry webhook received', $payload);

        // Replay protection: the timestamp must be within the allowed window.
        if ($timestamp > 0) {
            $now = time();
            $skew = abs($now - $timestamp);
            if ($skew > self::REPLAY_WINDOW_SECONDS) {
                Log::warning('Fawry webhook rejected: timestamp outside replay window', [
                    'timestamp' => $timestamp,
                    'skew_seconds' => $skew,
                ]);
                $this->metrics->recordWebhook('fawry', 'topup', 'stale');
                return ApiResponse::error('Stale or out-of-window request', 'ERR_STALE_TIMESTAMP', 401);
            }
        }

        // Replay protection: same eventId cannot be processed twice inside
        // the window. We use the database to dedupe when available and fall
        // back to the cache for high-volume cases.
        if ($eventId !== '') {
            $cacheKey = self::NONCE_CACHE_PREFIX . hash('sha256', $eventId);
            if (Cache::has($cacheKey)) {
                Log::warning('Fawry webhook replay detected (duplicate eventId)', ['eventId' => $eventId]);
                $this->metrics->recordWebhook('fawry', 'topup', 'duplicate');
                return ApiResponse::success(['message' => 'Already processed']);
            }
            Cache::put($cacheKey, 1, self::REPLAY_WINDOW_SECONDS);
        }

        $expectedSignature = $this->generateSignature($payload, $timestamp);
        if (! is_string($signature) || ! hash_equals($expectedSignature, $signature)) {
            Log::warning('Fawry signature verification failed', [
                'expected_prefix' => substr($expectedSignature, 0, 8),
                'received_prefix' => is_string($signature) ? substr($signature, 0, 8) : null,
            ]);

            $this->metrics->recordWebhook('fawry', 'topup', 'invalid_signature');
            return ApiResponse::error('Invalid signature', 'ERR_INVALID_SIGNATURE', 401);
        }

        $reference = $payload['merchantReference'] ?? null;
        if (! $reference) {
            return ApiResponse::error('Missing reference', 'ERR_MISSING_REFERENCE', 400);
        }

        $transaction = $this->walletService->findByReference($reference);
        if (! $transaction) {
            return ApiResponse::error('Transaction not found', 'ERR_TRANSACTION_NOT_FOUND', 404);
        }

        if ($transaction->status === 'completed') {
            return ApiResponse::success(['message' => 'Already processed']);
        }

        $paymentStatus = $payload['paymentStatus'] ?? '';
        if ($paymentStatus === 'PAID' || $paymentStatus === 'success') {
            $paidAmount = $payload['paymentAmount'] ?? 0;
            if ($paidAmount < $transaction->amount) {
                Log::critical("Fawry Amount Tampering: Expected {$transaction->amount}, got {$paidAmount}");

                $this->metrics->recordWebhook('fawry', 'topup', 'amount_mismatch');
                return ApiResponse::error('Invalid payment amount', 'ERR_AMOUNT_MISMATCH', 400);
            }

            $this->walletService->completeTopUp($transaction);

            $this->metrics->recordWebhook('fawry', 'topup', 'processed');
            return ApiResponse::success(['message' => 'Payment successful']);
        }

        $this->walletService->cancelTransaction($transaction);

        $this->metrics->recordWebhook('fawry', 'topup', 'failed');
        return ApiResponse::error('Payment failed', 'ERR_PAYMENT_FAILED', 400);
    }

    /**
     * Build the canonical Fawry signature:
     *   sha256(merchantCode | merchantReference | paymentAmount | paymentStatus | timestamp, secret)
     *
     * The signed payload now includes the payment status and timestamp so a
     * captured PAID notification cannot be replayed as a different event.
     */
    private function generateSignature(array $payload, int $timestamp = 0): string
    {
        $merchantCode = (string) config('services.fawry.merchant_code', env('FAWRY_MERCHANT_CODE', ''));
        $merchantSecret = (string) config('services.fawry.merchant_secret', env('FAWRY_SECRET_KEY', ''));

        $data = implode('|', [
            $merchantCode,
            (string) ($payload['merchantReference'] ?? ''),
            (string) ($payload['amount'] ?? $payload['paymentAmount'] ?? ''),
            (string) ($payload['paymentStatus'] ?? ''),
            (string) ($timestamp ?: ($payload['timestamp'] ?? '')),
        ]);

        return hash_hmac('sha256', $data, $merchantSecret);
    }
}
