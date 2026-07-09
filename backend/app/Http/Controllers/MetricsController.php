<?php

namespace App\Http\Controllers;

use App\Services\Metrics\ApplicationMetrics;
use App\Services\Metrics\MetricsRegistry;
use Symfony\Component\HttpFoundation\Response;

/**
 * RELIABILITY-MAJOR-02: Prometheus-compatible /metrics endpoint.
 *
 * Emits the Prometheus text exposition format. Designed to be
 * scraped by Prometheus every 15-30 seconds.
 *
 * IP allowlist: the `restrict_to_internal_ips` middleware (mounted
 * on the route in routes/api.php) enforces a CIDR allowlist.
 * Requests from non-allowlisted IPs get 404 (not 403) so a
 * port-scan does not reveal the existence of the endpoint.
 * Configure METRICS_ALLOWED_IPS in .env as a comma-separated
 * CIDR list. Defaults:
 *
 *   - 127.0.0.1     (local scraper)
 *   - 10.0.0.0/8    (RFC1918 internal)
 *   - 172.16.0.0/12 (RFC1918 internal)
 *   - 192.168.0.0/16 (RFC1918 internal)
 *
 * No authentication header is required by Prometheus itself, so
 * the network boundary is the only access control. If a stronger
 * guarantee is needed, put the endpoint behind a sidecar proxy
 * that requires mTLS.
 */
class MetricsController extends Controller
{
    public function __construct(
        private MetricsRegistry $registry,
        private ApplicationMetrics $appMetrics,
    ) {}

    public function __invoke(): Response
    {
        // Snapshot the gauges that depend on database state. Done
        // here (not in a service container boot) so we get fresh
        // values on every scrape without holding a long-lived DB
        // connection.
        $this->appMetrics->snapshotGauges();

        $body = $this->registry->render();

        return new Response(
            $body,
            200,
            [
                // Prometheus requires text/plain; version=0.0.4
                // and a charset so curl/preview doesn't choke.
                'Content-Type' => 'text/plain; version=0.0.4; charset=utf-8',
                'Cache-Control' => 'no-store',
            ]
        );
    }
}
