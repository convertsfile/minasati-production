<?php

namespace Tests\Feature\Security;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * SEC-MAJOR-01: every API response carries baseline hardening headers.
 *
 * Verifies the SecurityHeadersMiddleware is registered and emits the
 * headers we expect on /api/* responses. The full header suite is:
 *   - X-Content-Type-Options: nosniff
 *   - X-Frame-Options: DENY
 *   - Referrer-Policy: strict-origin-when-cross-origin
 *   - Permissions-Policy: camera=(), microphone=(), geolocation=()
 *   - Cross-Origin-Opener-Policy: same-origin
 *   - Cross-Origin-Resource-Policy: same-origin
 *   - Cache-Control: no-store, no-cache, must-revalidate, private
 *   - Pragma: no-cache
 *   - Strict-Transport-Security: ...  (only on secure requests)
 */
class SecurityHeadersTest extends TestCase
{
    #[Test]
    public function api_responses_include_baseline_hardening_headers(): void
    {
        // Hit a public endpoint that doesn't need auth.
        $response = $this->getJson('/api/courses');

        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->assertHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
        $response->assertHeader('Cross-Origin-Opener-Policy', 'same-origin');
        $response->assertHeader('Cross-Origin-Resource-Policy', 'same-origin');

        // The Cache-Control header is the union of multiple middleware (Laravel's
        // default + our SecurityHeadersMiddleware). We assert that all the
        // directives we care about are present, regardless of order.
        $cacheControl = $response->headers->get('Cache-Control', '');
        foreach (['no-store', 'no-cache', 'must-revalidate', 'private'] as $directive) {
            $this->assertStringContainsString($directive, $cacheControl, "Cache-Control missing directive: {$directive}");
        }
        $response->assertHeader('Pragma', 'no-cache');
    }

    #[Test]
    public function health_endpoint_includes_hardening_headers(): void
    {
        // The /up health endpoint also gets the headers.
        $response = $this->get('/up');

        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'DENY');
    }
}
