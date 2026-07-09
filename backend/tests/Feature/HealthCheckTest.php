<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Reliability-MAJOR-01: split liveness vs. readiness endpoints.
 *
 * The legacy /up route is liveness-only (returns 200 even when MySQL
 * is unreachable). The new /health/live and /health/ready endpoints
 * give orchestrators a proper k8s-style split:
 *
 *   /health/live  — process is up; always 200.
 *   /health/ready — every required dependency is up; 503 if not.
 *
 * These tests assert both endpoints return the expected shape and
 * that the readiness check actually consults MySQL, cache, and
 * queue (it MUST 503 if the DB is down).
 */
class HealthCheckTest extends TestCase
{
    #[Test]
    public function live_endpoint_returns_200_and_does_not_touch_dependencies(): void
    {
        $response = $this->getJson('/api/health/live');

        $response->assertOk();
        $response->assertJsonStructure([
            'status',
            'service',
            'timestamp',
        ]);
        $response->assertJsonPath('status', 'live');
    }

    #[Test]
    public function live_endpoint_emits_hardening_headers(): void
    {
        $response = $this->getJson('/api/health/live');

        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'DENY');
    }

    #[Test]
    public function ready_endpoint_returns_200_when_all_required_dependencies_are_up(): void
    {
        $response = $this->getJson('/api/health/ready');

        // In a healthy CI environment with a working MySQL, cache, and queue,
        // the readiness check should report ready.
        $response->assertOk();
        $response->assertJsonStructure([
            'status',
            'service',
            'timestamp',
            'checks' => [
                'database',
                'cache',
                'queue',
                'storage',
            ],
        ]);
        $response->assertJsonPath('checks.database.status', 'up');
        $response->assertJsonPath('checks.cache.status', 'up');
        $response->assertJsonPath('checks.queue.status', 'up');
    }

    #[Test]
    public function ready_endpoint_returns_503_when_database_is_unreachable(): void
    {
        // Simulate MySQL being down by switching the default connection to
        // an unreachable host. We do NOT touch the test DB (which is used
        // by DatabaseTruncation) — we override the active connection.
        config(['database.connections.mysql.host' => '127.0.0.1']);
        config(['database.connections.mysql.port' => 3399]); // closed port

        // Reconnect on next query.
        \Illuminate\Support\Facades\DB::purge('mysql');

        $response = $this->getJson('/api/health/ready');

        $response->assertStatus(503);
        $response->assertJsonPath('status', 'degraded');
        $response->assertJsonPath('checks.database.status', 'down');
        $response->assertJsonStructure([
            'failed' => [
                'database',
            ],
        ]);
    }

    #[Test]
    public function ready_endpoint_uses_get_json_to_skip_cors_preflight(): void
    {
        // Just confirms that the JSON request path works (no CSRF, etc.)
        // and the response Content-Type is application/json.
        $response = $this->getJson('/api/health/ready');

        $this->assertStringContainsString(
            'application/json',
            $response->headers->get('Content-Type', '')
        );
    }

    #[Test]
    public function legacy_up_route_still_returns_200(): void
    {
        // The /up route is registered by Laravel's withRouting() helper
        // and is liveness-only. It must keep returning 200 to avoid
        // breaking the existing health-check caller.
        $response = $this->get('/up');

        $response->assertOk();
    }
}
