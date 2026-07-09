<?php

namespace App\Http\Middleware;

use App\Services\Metrics\ApplicationMetrics;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * RELIABILITY-MAJOR-02: record every HTTP request as
 * http_requests_total + http_request_duration_seconds so the
 * /metrics endpoint has actual data to emit.
 *
 * Mounted globally on the API stack. Skips the /metrics endpoint
 * itself so the scrape loop is not inflated by N scrapes per
 * minute.
 */
class RecordHttpMetrics
{
    public function __construct(private ApplicationMetrics $metrics)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        // Don't pollute the metrics output with scrape traffic.
        if ($request->is('api/metrics')) {
            return $next($request);
        }

        $started = microtime(true);

        /** @var Response $response */
        $response = $next($request);

        $duration = microtime(true) - $started;

        // Best-effort: the route name may not be resolved yet on
        // a 404, so fall back to the path. The label cardinality
        // guard is in ApplicationMetrics::normalizeRoute.
        $route = $request->route() ? $request->route()->uri() : $request->path();

        try {
            $this->metrics->recordHttpRequest(
                $request->getMethod(),
                '/' . ltrim($route, '/'),
                $response->getStatusCode(),
                $duration,
            );
        } catch (\Throwable $e) {
            // A metrics failure must NEVER break a real request.
            report($e);
        }

        return $response;
    }
}
