<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * SECURITY: emit baseline hardening headers on every API response.
 *
 *   - X-Content-Type-Options: nosniff
 *     Blocks MIME-sniffing. Stops an attacker from uploading "image.png"
 *     that the browser interprets as HTML/JS.
 *
 *   - X-Frame-Options: DENY
 *     Blocks clickjacking via <iframe> embedding. Defence in depth in case
 *     the CSP frame-ancestors directive is ever loosened.
 *
 *   - Referrer-Policy: strict-origin-when-cross-origin
 *     Sends only the origin (not the path) on cross-origin requests, and
 *     the full URL only for same-origin. Prevents leaking internal paths
 *     in the Referer header.
 *
 *   - Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
 *     (HTTPS-only — only emitted when the request is known to be secure.)
 *     2-year pin so the browser refuses plaintext downgrades.
 *
 *   - Permissions-Policy: camera=(), microphone=(), geolocation=()
 *     Disables the powerful device APIs the platform does not need.
 *
 *   - Cross-Origin-Opener-Policy: same-origin
 *   - Cross-Origin-Resource-Policy: same-origin
 *   - Cross-Origin-Embedder-Policy: require-corp
 *     Isolate browsing-context group. Mitigates side-channel attacks
 *     (Spectre). The embedder policy is opt-in — add to opt-in list if
 *     you embed any third-party iframes.
 *
 * The Content-Security-Policy is intentionally NOT set on /api/* because
 * the API returns JSON, not HTML. CSP is set on the Next.js side.
 *
 * Reference: OWASP Secure Headers Project.
 */
class SecurityHeadersMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
        $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin');
        $response->headers->set('Cross-Origin-Resource-Policy', 'same-origin');

        // HSTS only on secure connections — sending it on plaintext causes
        // some browsers to block the upgrade silently.
        if ($request->isSecure()) {
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age=63072000; includeSubDomains; preload'
            );
        }

        // Cache-Control on API responses: never cache sensitive data.
        if ($request->is('api/*')) {
            $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            $response->headers->set('Pragma', 'no-cache');
        }

        return $response;
    }
}
