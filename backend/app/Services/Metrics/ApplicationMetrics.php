<?php

namespace App\Services\Metrics;

use App\Models\WalletTopupRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;

/**
 * Application-level metrics glue.
 *
 * RELIABILITY-MAJOR-02: operators were blind to Laravel request
 * rate, queue backlog, failed jobs, wallet pending topups, and
 * webhook callouts. This service wires the in-process
 * MetricsRegistry to the data sources that matter.
 *
 * Histogram buckets follow Prometheus client_php defaults for
 * HTTP latency (5ms .. 10s). Adjust if real traffic profile
 * suggests a tighter or wider range.
 */
class ApplicationMetrics
{
    public const HTTP_DURATION_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0];

    public function __construct(private MetricsRegistry $registry)
    {
    }

    /**
     * Record an HTTP request's outcome and duration.
     */
    public function recordHttpRequest(string $method, string $route, int $status, float $durationSeconds): void
    {
        $labels = [
            'method' => strtoupper($method),
            'route' => $this->normalizeRoute($route),
            'status' => (string) $status,
        ];

        $this->registry->counterInc(
            'http_requests_total',
            $labels,
            1.0,
            'Total HTTP requests handled by the Laravel backend.'
        );

        $this->registry->histogramObserve(
            'http_request_duration_seconds',
            $durationSeconds,
            self::HTTP_DURATION_BUCKETS,
            $labels,
            'HTTP request duration in seconds.'
        );
    }

    /**
     * Record a webhook receipt. Used by the payment-gateway
     * controllers (Fawry, Vodafone Cash) and the VOD webhook.
     */
    public function recordWebhook(string $source, string $event, string $outcome): void
    {
        $this->registry->counterInc(
            'webhook_received_total',
            [
                'source' => $source,
                'event' => $event,
                'outcome' => $outcome,
            ],
            1.0,
            'Total webhook events received from external sources.'
        );
    }

    /**
     * Snapshot the queue / wallet / failed-jobs gauges. Cheap
     * (3 small COUNT queries) and called on every /metrics scrape.
     */
    public function snapshotGauges(): void
    {
        // queue_pending_jobs — total jobs in the default queue.
        try {
            $pending = (int) Queue::size();
            $this->registry->gaugeSet(
                'queue_pending_jobs',
                (float) $pending,
                ['queue' => (string) config('queue.default')],
                'Number of jobs currently waiting in the queue.'
            );
        } catch (\Throwable $e) {
            // If the queue is broken, do not break the /metrics scrape.
        }

        // queue_failed_jobs — count from the failed_jobs table.
        try {
            $failed = (int) DB::table('failed_jobs')->count();
            $this->registry->gaugeSet(
                'queue_failed_jobs',
                (float) $failed,
                [],
                'Number of jobs in the failed_jobs table (needs manual intervention).'
            );
        } catch (\Throwable $e) {
            // failed_jobs table may not exist in fresh installs.
        }

        // wallet_pending_topups — count of topups awaiting admin review.
        try {
            $pendingTopups = (int) WalletTopupRequest::where('status', 'pending')->count();
            $this->registry->gaugeSet(
                'wallet_pending_topups',
                (float) $pendingTopups,
                [],
                'Number of wallet topups awaiting admin approval.'
            );
        } catch (\Throwable $e) {
            // WalletTopupRequest model may not be in scope of a test run.
        }
    }

    /**
     * Strip query strings and numeric IDs from a route so the
     * label cardinality stays bounded. /api/courses/123 becomes
     * /api/courses/{id}; /api/admin/users/42/wallet becomes
     * /api/admin/users/{id}/wallet.
     */
    private function normalizeRoute(string $route): string
    {
        // Collapse numeric path segments.
        $normalized = preg_replace('#/[0-9]+(?=/|$)#', '/{id}', $route);
        // Strip query string.
        if (($q = strpos($normalized, '?')) !== false) {
            $normalized = substr($normalized, 0, $q);
        }
        // Cap length so a stray 1KB URL doesn't bloat the label.
        if (strlen($normalized) > 200) {
            $normalized = substr($normalized, 0, 200) . '…';
        }
        return $normalized === '' ? '/' : $normalized;
    }
}
