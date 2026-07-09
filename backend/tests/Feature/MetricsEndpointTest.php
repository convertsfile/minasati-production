<?php

namespace Tests\Feature;

use App\Services\Metrics\ApplicationMetrics;
use App\Services\Metrics\MetricsRegistry;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Reliability-MAJOR-02: Prometheus /metrics endpoint.
 *
 * Operators were blind to Laravel request rate, queue backlog,
 * failed jobs, wallet pending topups, and webhook callouts. This
 * test verifies the /metrics endpoint:
 *
 *   1. Is reachable at /api/metrics from an allowlisted IP.
 *   2. Returns text/plain in the Prometheus exposition format.
 *   3. Reports the documented base metrics (queue_pending_jobs,
 *      queue_failed_jobs, wallet_pending_topups).
 *   4. Accepts a recorded HTTP request and surfaces it as
 *      http_requests_total + http_request_duration_seconds.
 *   5. Is hidden from non-allowlisted IPs (404, not 403) so a
 *      port-scan does not reveal its existence.
 *   6. Honours the METRICS_ALLOWED_IPS override.
 */
class MetricsEndpointTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Reset the in-process registry so tests don't leak state.
        app(MetricsRegistry::class)->reset();
    }

    #[Test]
    public function metrics_endpoint_is_reachable_and_returns_text_exposition_format(): void
    {
        $response = $this->fromIp('127.0.0.1')->get('/api/metrics');

        $response->assertOk();
        $this->assertStringContainsString(
            'text/plain',
            $response->headers->get('Content-Type', '')
        );
    }

    #[Test]
    public function metrics_endpoint_emits_help_and_type_lines_for_each_family(): void
    {
        // Record one metric of each kind so we know they're all
        // wired up.
        $app = app(ApplicationMetrics::class);
        $app->recordHttpRequest('GET', '/api/courses', 200, 0.123);
        $app->recordWebhook('fawry', 'topup.approved', 'processed');

        $body = $this->fromIp('127.0.0.1')->get('/api/metrics')->getContent();

        $this->assertStringContainsString('# HELP http_requests_total', $body);
        $this->assertStringContainsString('# TYPE http_requests_total counter', $body);
        $this->assertStringContainsString('# HELP http_request_duration_seconds', $body);
        $this->assertStringContainsString('# TYPE http_request_duration_seconds histogram', $body);
        $this->assertStringContainsString('# HELP webhook_received_total', $body);
        $this->assertStringContainsString('# TYPE webhook_received_total counter', $body);
    }

    #[Test]
    public function metrics_endpoint_reports_pending_queue_jobs(): void
    {
        $body = $this->fromIp('127.0.0.1')->get('/api/metrics')->getContent();

        $this->assertStringContainsString('queue_pending_jobs', $body);
        $this->assertStringContainsString('queue_failed_jobs', $body);
    }

    #[Test]
    public function metrics_endpoint_reports_wallet_pending_topups(): void
    {
        $body = $this->fromIp('127.0.0.1')->get('/api/metrics')->getContent();

        $this->assertStringContainsString('wallet_pending_topups', $body);
    }

    #[Test]
    public function recorded_http_request_appears_in_metrics_output(): void
    {
        $app = app(ApplicationMetrics::class);
        $app->recordHttpRequest('POST', '/api/auth/login', 200, 0.250);
        $app->recordHttpRequest('POST', '/api/auth/login', 401, 0.150);

        $body = $this->fromIp('127.0.0.1')->get('/api/metrics')->getContent();

        // The two POST /api/auth/login samples should appear with
        // their respective status labels.
        $this->assertStringContainsString('http_requests_total{', $body);
        $this->assertStringContainsString('method="POST"', $body);
        $this->assertStringContainsString('status="200"', $body);
        $this->assertStringContainsString('status="401"', $body);

        // Histogram exposes the +Inf bucket and the _count / _sum
        // suffix lines.
        $this->assertStringContainsString('http_request_duration_seconds_bucket', $body);
        $this->assertStringContainsString('http_request_duration_seconds_count', $body);
        $this->assertStringContainsString('http_request_duration_seconds_sum', $body);
        $this->assertStringContainsString('le="+Inf"', $body);
    }

    #[Test]
    public function recorded_webhook_appears_in_metrics_output(): void
    {
        $app = app(ApplicationMetrics::class);
        $app->recordWebhook('vodafone_cash', 'topup.approved', 'processed');
        $app->recordWebhook('vodafone_cash', 'topup.approved', 'duplicate');

        $body = $this->fromIp('127.0.0.1')->get('/api/metrics')->getContent();

        $this->assertStringContainsString('webhook_received_total{', $body);
        $this->assertStringContainsString('source="vodafone_cash"', $body);
        $this->assertStringContainsString('outcome="processed"', $body);
        $this->assertStringContainsString('outcome="duplicate"', $body);
    }

    #[Test]
    public function registry_renders_valid_prometheus_text_format(): void
    {
        // White-box check: the registry is responsible for the
        // text format. Verify the structure directly.
        $registry = app(MetricsRegistry::class);
        $registry->counterInc('demo_counter_total', ['foo' => 'bar'], 7.0, 'demo');
        $registry->gaugeSet('demo_gauge_bytes', 1234.5, ['mount' => '/var/tmp'], 'demo');
        $registry->histogramObserve('demo_duration_seconds', 0.25, [0.1, 0.5, 1.0], ['op' => 'x'], 'demo');

        $rendered = $registry->render();

        $this->assertStringContainsString('# HELP demo_counter_total demo', $rendered);
        $this->assertStringContainsString('# TYPE demo_counter_total counter', $rendered);
        $this->assertStringContainsString('demo_counter_total{foo="bar"} 7', $rendered);

        $this->assertStringContainsString('# TYPE demo_gauge_bytes gauge', $rendered);
        $this->assertStringContainsString('demo_gauge_bytes{mount="/var/tmp"}', $rendered);

        $this->assertStringContainsString('# TYPE demo_duration_seconds histogram', $rendered);
        $this->assertStringContainsString('demo_duration_seconds_bucket', $rendered);
        $this->assertStringContainsString('demo_duration_seconds_count', $rendered);
        $this->assertStringContainsString('demo_duration_seconds_sum', $rendered);
    }

    // -------------------------------------------------------------------
    // IP allowlist enforcement (the MAJOR fix):
    //
    //   127.0.0.1   — allow (default + loopback)
    //   10.1.2.3    — allow (RFC1918)
    //   8.8.8.8     — deny (public)
    //
    // Non-allowlisted callers must get a 404, not a 403, so the
    // endpoint's existence is not leaked to a port-scan.
    // -------------------------------------------------------------------

    #[Test]
    public function metrics_endpoint_returns_404_for_non_allowlisted_ip(): void
    {
        $response = $this->fromIp('8.8.8.8')->get('/api/metrics');

        $response->assertStatus(404);
        $this->assertStringNotContainsString(
            'http_requests_total',
            (string) $response->getContent()
        );
    }

    #[Test]
    public function metrics_endpoint_allows_rfc1918_ip_by_default(): void
    {
        $response = $this->fromIp('10.1.2.3')->get('/api/metrics');

        $response->assertOk();
    }

    #[Test]
    public function metrics_endpoint_allows_172_16_rfc1918_ip_by_default(): void
    {
        $response = $this->fromIp('172.20.5.6')->get('/api/metrics');

        $response->assertOk();
    }

    #[Test]
    public function metrics_endpoint_allows_192_168_rfc1918_ip_by_default(): void
    {
        $response = $this->fromIp('192.168.1.42')->get('/api/metrics');

        $response->assertOk();
    }

    #[Test]
    public function metrics_endpoint_honours_metrics_allowed_ips_override(): void
    {
        // Replace the default loopback + RFC1918 ranges with a
        // single arbitrary address. A scraper at 127.0.0.1 should
        // be denied because it is no longer on the explicit list.
        $previous = env('METRICS_ALLOWED_IPS');
        putenv('METRICS_ALLOWED_IPS=203.0.113.5');
        try {
            $denied = $this->fromIp('127.0.0.1')->get('/api/metrics');
            $denied->assertStatus(404);

            $allowed = $this->fromIp('203.0.113.5')->get('/api/metrics');
            $allowed->assertOk();
        } finally {
            if ($previous === false) {
                putenv('METRICS_ALLOWED_IPS');
            } else {
                putenv('METRICS_ALLOWED_IPS='.$previous);
            }
        }
    }

    #[Test]
    public function metrics_endpoint_deny_response_is_404_not_403(): void
    {
        // Critical: must be 404, not 403, to avoid leaking the
        // endpoint's existence on a port-scan.
        $response = $this->fromIp('8.8.8.8')->get('/api/metrics');

        $this->assertSame(404, $response->getStatusCode());
    }

    /**
     * Test helper: simulate a request originating from $ip. The
     * Symfony Request that backs the test request reads REMOTE_ADDR
     * to derive the client IP; we override it before issuing the
     * HTTP call.
     */
    private function fromIp(string $ip): self
    {
        return $this->withServerVariables(['REMOTE_ADDR' => $ip]);
    }
}
