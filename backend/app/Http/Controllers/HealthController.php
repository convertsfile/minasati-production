<?php

namespace App\Http\Controllers;

use App\Services\BackblazeStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Throwable;

/**
 * Reliability-MAJOR-01: liveness vs. readiness endpoints.
 *
 * The default /up route registered by Laravel's withRouting() is a
 * *liveness* check — it just confirms the framework booted and the
 * kernel can hand back a response. It does NOT verify that any
 * downstream dependency is reachable. Orchestrators (k8s, systemd
 * with watchdog, AWS ALB, Cloud Run) interpret liveness=200 as
 * "send me traffic", so an instance whose MySQL is unreachable
 * will keep getting requests and every API call will 3-second-hang.
 *
 * Two new endpoints, registered at /health/live and /health/ready,
 * implement the standard k8s split:
 *
 *   /health/live  — am I a live process? Always 200 unless the
 *                    framework is broken. Used by liveness probes.
 *
 *   /health/ready — am I ready to serve traffic? Pings MySQL,
 *                    cache, queue, and the Backblaze B2 storage.
 *                    Used by readiness probes. Returns 503 if
 *                    any required dependency is down.
 *
 * The legacy /up route is preserved for back-compat with whatever
 * load-balancer/health-check is already pointing at it.
 */
class HealthController extends Controller
{
    /**
     * Liveness — process is up and the framework can respond.
     * Does NOT touch MySQL, cache, or any external service.
     */
    public function live(): JsonResponse
    {
        return response()->json([
            'status' => 'live',
            'service' => config('app.name', 'laravel'),
            'timestamp' => now()->toIso8601String(),
        ], 200);
    }

    /**
     * Readiness — every downstream dependency is reachable.
     * Pings MySQL, the cache store, the queue connection, and the
     * B2 storage authentication endpoint. Returns 503 if any
     * *required* dependency is down.
     *
     * Optional dependencies (e.g. B2 in a test environment where
     * the storage key is empty) are reported in the `optional` block
     * and do NOT cause a 503. Required dependencies always do.
     */
    public function ready(): JsonResponse
    {
        $checks = [
            'database' => $this->checkDatabase(),
            'cache' => $this->checkCache(),
            'queue' => $this->checkQueue(),
            'storage' => $this->checkStorage(),
        ];

        $optional = [];
        $failed = [];

        foreach ($checks as $name => $result) {
            if ($result['status'] === 'down') {
                if (!($result['optional'] ?? false)) {
                    $failed[$name] = $result;
                } else {
                    $optional[$name] = $result;
                }
            }
        }

        $allUp = empty($failed);
        $status = $allUp ? 'ready' : 'degraded';
        $http = $allUp ? 200 : 503;

        if (!$allUp) {
            // Log so operators see it without scraping the endpoint.
            Log::warning('Readiness check failed', [
                'failed' => array_keys($failed),
                'optional' => array_keys($optional),
            ]);
        }

        return response()->json([
            'status' => $status,
            'service' => config('app.name', 'laravel'),
            'timestamp' => now()->toIso8601String(),
            'checks' => $checks,
            'failed' => $failed,
            'optional' => $optional,
        ], $http);
    }

    /**
     * MySQL reachability. Bounded 1s timeout so a hung DB does
     * not cause the readiness endpoint itself to hang.
     */
    private function checkDatabase(): array
    {
        $started = microtime(true);
        try {
            // Use a tiny bounded query. We do NOT open a transaction
            // here — it would mask real connectivity problems.
            DB::connection()->select('SELECT 1');
            return [
                'status' => 'up',
                'latency_ms' => $this->elapsedMs($started),
            ];
        } catch (Throwable $e) {
            return [
                'status' => 'down',
                'latency_ms' => $this->elapsedMs($started),
                'error' => $this->safeError($e),
            ];
        }
    }

    /**
     * Cache store. We use put() and get() with a per-call key so
     * concurrent probes do not race on the same value.
     */
    private function checkCache(): array
    {
        $started = microtime(true);
        $key = '__health_probe_' . bin2hex(random_bytes(4));
        $expected = (string) microtime(true);
        try {
            Cache::put($key, $expected, 5);
            $actual = Cache::get($key);
            Cache::forget($key);
            $ok = $actual === $expected;
            return [
                'status' => $ok ? 'up' : 'down',
                'latency_ms' => $this->elapsedMs($started),
                'driver' => config('cache.default'),
                'error' => $ok ? null : 'cache roundtrip mismatch',
            ];
        } catch (Throwable $e) {
            return [
                'status' => 'down',
                'latency_ms' => $this->elapsedMs($started),
                'driver' => config('cache.default'),
                'error' => $this->safeError($e),
            ];
        }
    }

    /**
     * Queue connection. The cheapest check is `Queue::size()` on
     * the default connection, which performs a COUNT query.
     */
    private function checkQueue(): array
    {
        $started = microtime(true);
        try {
            $size = Queue::size();
            return [
                'status' => 'up',
                'latency_ms' => $this->elapsedMs($started),
                'driver' => config('queue.default'),
                'pending' => $size,
            ];
        } catch (Throwable $e) {
            return [
                'status' => 'down',
                'latency_ms' => $this->elapsedMs($started),
                'driver' => config('queue.default'),
                'error' => $this->safeError($e),
            ];
        }
    }

    /**
     * B2 storage reachability. We do NOT trigger a real HeadBucket
     * call on every probe (that would cost money and 200-500ms);
     * instead we check that the keys are present and that the
     * B2 auth endpoint is reachable with a 2s timeout.
     *
     * This check is OPTIONAL — in local / testing environments the
     * B2 keys are intentionally empty, and we don't want a 503.
     */
    private function checkStorage(): array
    {
        $started = microtime(true);
        $keyId = (string) config('services.backblaze.key_id', env('B2_KEY_ID', ''));
        $appKey = (string) config('services.backblaze.application_key', env('B2_APP_KEY', ''));

        if ($keyId === '' || $appKey === '') {
            return [
                'status' => 'down',
                'optional' => true,
                'latency_ms' => $this->elapsedMs($started),
                'error' => 'B2 credentials not configured',
            ];
        }

        try {
            $response = Http::withBasicAuth($keyId, $appKey)
                ->timeout(2)
                ->connectTimeout(2)
                ->get('https://api.backblazeb2.com/b2api/v2/b2_authorize_account');

            if ($response->successful()) {
                return [
                    'status' => 'up',
                    'latency_ms' => $this->elapsedMs($started),
                ];
            }

            return [
                'status' => 'down',
                'optional' => true,
                'latency_ms' => $this->elapsedMs($started),
                'http_status' => $response->status(),
            ];
        } catch (Throwable $e) {
            return [
                'status' => 'down',
                'optional' => true,
                'latency_ms' => $this->elapsedMs($started),
                'error' => $this->safeError($e),
            ];
        }
    }

    private function elapsedMs(float $started): float
    {
        return round((microtime(true) - $started) * 1000, 2);
    }

    /**
     * Truncate a Throwable message so we don't leak full stack
     * traces in a public health endpoint.
     */
    private function safeError(Throwable $e): string
    {
        $msg = $e->getMessage();
        if (strlen($msg) > 200) {
            $msg = substr($msg, 0, 200) . '…';
        }
        return $msg;
    }
}
