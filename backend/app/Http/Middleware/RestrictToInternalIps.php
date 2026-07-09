<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * RELIABILITY-MAJOR-02: enforce the IP allowlist that
 * MetricsController's docstring promises.
 *
 * The /api/metrics endpoint is scraped by Prometheus, which does
 * NOT carry auth headers. We therefore restrict it at the network
 * layer — but the previous code only documented the restriction,
 * it did not enforce it. Any internet caller could hit /api/metrics
 * and:
 *
 *   - trigger 3 COUNT queries per scrape (DoS),
 *   - read internal counters (webhook outcomes, queue depth,
 *     wallet pending topups),
 *   - pollute http_requests_total labels.
 *
 * This middleware reads METRICS_ALLOWED_IPS (comma-separated
 * CIDR list) and returns 404 — not 403 — for non-allowlisted
 * callers. The 404 hides the endpoint's existence from a
 * port-scan, matching the documented intent.
 *
 * Defaults match the docstring: 127.0.0.1, 10.0.0.0/8,
 * 172.16.0.0/12, 192.168.0.0/16.
 *
 * The trusted-proxies chain is honoured: if the request arrived
 * through a trusted reverse proxy, the X-Forwarded-For header
 * is used to determine the *real* client IP. The proxy chain
 * itself is configured via TrustedProxies middleware (already
 * shipped in Laravel 12 via withMiddleware()).
 */
class RestrictToInternalIps
{
    /**
     * Default allowlist used when METRICS_ALLOWED_IPS is unset.
     * Covers loopback and the three RFC1918 private ranges.
     */
    private const DEFAULT_ALLOWED = [
        '127.0.0.1',
        '10.0.0.0/8',
        '172.16.0.0/12',
        '192.168.0.0/16',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $clientIp = $this->resolveClientIp($request);
        $allowed = $this->parseAllowedList((string) env('METRICS_ALLOWED_IPS', ''));

        if ($this->ipMatches($clientIp, $allowed)) {
            return $next($request);
        }

        // 404 (not 403) on purpose — see class docstring.
        abort(404);
    }

    /**
     * Resolve the originating client IP. We respect trusted-proxy
     * chains by going through the Request::ip() helper, which
     * honours the X-Forwarded-For header only when the request
     * came from a configured trusted proxy.
     */
    private function resolveClientIp(Request $request): string
    {
        return (string) $request->ip();
    }

    /**
     * Parse the comma-separated env value into an array of
     * CIDR / exact entries. Empty env falls back to DEFAULT_ALLOWED.
     *
     * @return array<int,string>
     */
    private function parseAllowedList(string $raw): array
    {
        $raw = trim($raw);
        if ($raw === '') {
            return self::DEFAULT_ALLOWED;
        }

        $parts = array_values(array_filter(array_map('trim', explode(',', $raw))));

        return $parts === [] ? self::DEFAULT_ALLOWED : $parts;
    }

    /**
     * Test whether an IPv4 / IPv6 client IP falls inside the
     * allowlist. Supports both exact-match (e.g. "127.0.0.1") and
     * CIDR-notation entries (e.g. "10.0.0.0/8").
     *
     * @param  array<int,string>  $allowed
     */
    private function ipMatches(string $clientIp, array $allowed): bool
    {
        if ($clientIp === '') {
            return false;
        }

        foreach ($allowed as $entry) {
            if ($this->entryMatches($clientIp, $entry)) {
                return true;
            }
        }

        return false;
    }

    private function entryMatches(string $clientIp, string $entry): bool
    {
        $entry = trim($entry);
        if ($entry === '') {
            return false;
        }

        // Plain IP — exact match.
        if (! str_contains($entry, '/')) {
            return $this->normalize($clientIp) === $this->normalize($entry);
        }

        // CIDR — split and verify.
        [$subnet, $bits] = explode('/', $entry, 2) + [null, null];
        if ($subnet === null || $bits === null) {
            return false;
        }

        $bits = (int) $bits;
        $clientLong = ip2long($this->normalize($clientIp));
        $subnetLong = ip2long($this->normalize($subnet));
        if ($clientLong === false || $subnetLong === false) {
            // ip2long is IPv4-only. If either side is IPv6 or
            // unparseable, fall back to string equality so a
            // single IPv6 entry like "::1" still works.
            return $this->normalize($clientIp) === $this->normalize($subnet);
        }

        if ($bits <= 0) {
            return true;
        }
        if ($bits >= 32) {
            return $clientLong === $subnetLong;
        }
        $mask = -1 << (32 - $bits);

        return ($clientLong & $mask) === ($subnetLong & $mask);
    }

    private function normalize(string $ip): string
    {
        // ip2long / long2ip work in 32-bit space. inet_pton /
        // inet_ntop handle IPv6. For our purposes we only need
        // a stable textual form for the IPv4 path; for IPv6 we
        // pass through. Trim a stray scope id.
        $ip = trim($ip);
        $pct = strpos($ip, '%');
        if ($pct !== false) {
            $ip = substr($ip, 0, $pct);
        }

        return $ip;
    }
}
