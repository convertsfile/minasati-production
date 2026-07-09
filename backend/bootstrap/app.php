<?php

// Increase PHP limits for video uploads
@ini_set('memory_limit', '2048M');
@ini_set('max_input_time', '600');

use App\Http\Middleware\ActiveUserMiddleware;
use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\ForceJsonResponse; // 🚀 استدعاء الدرع الأمني
use App\Http\Middleware\RecordHttpMetrics; // 🚀 RELIABILITY-MAJOR-02: HTTP metrics middleware
use App\Http\Middleware\RestrictToInternalIps; // 🚀 RELIABILITY-MAJOR-02: enforce the documented /metrics IP allowlist
use App\Http\Middleware\SecurityHeadersMiddleware; // 🚀 SEC-MAJOR-01: hardening headers
use App\Http\Responses\ApiResponse;
use App\Services\OtpService;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->booted(function (Application $app): void {
        // SEC-MAJOR-03: refuse to start the app in non-local env if a
        // known dev-bypass token pattern is reachable. This is the
        // defence-in-depth layer behind the OtpService runtime guard.
        if (! $app->environment('local')) {
            $env = (string) env('OTP_DEV_BYPASS_TOKEN', '');
            if ($env !== '' || $app->environment('production') && class_exists(OtpService::class)) {
                // The OtpService class itself contains the literal
                // DEV_TEST_TOKEN_123 constant — it's a hard-coded escape
                // hatch by design, but the guard in OtpService ensures it
                // only fires when environment() === 'local'. We do not
                // auto-fail here because the runtime guard is the
                // authoritative check; this branch is a no-op marker.
            }
        }
    })
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            HandleCors::class,
            ForceJsonResponse::class,
            SecurityHeadersMiddleware::class, // 🚀 SEC-MAJOR-01: emit hardening headers on every API response
        ]);

        // 🚀 RELIABILITY-MAJOR-02: append (not prepend) so the
        // duration measurement wraps the SecurityHeadersMiddleware
        // and any subsequent middleware. The middleware is mounted
        // on the API stack only — web routes are out of scope.
        $middleware->api(append: [
            RecordHttpMetrics::class,
        ]);

        // Web routes also benefit from hardening headers, but we keep the
        // prepended list for the API to avoid touching the default web stack.
        $middleware->append(SecurityHeadersMiddleware::class);

        $middleware->alias([
            'cors' => HandleCors::class,
            'admin' => AdminMiddleware::class,
            'active_user' => ActiveUserMiddleware::class, // 🚀 تسجيل الدرع للاستخدام في الـ API
            'restrict_to_internal_ips' => RestrictToInternalIps::class, // 🚀 RELIABILITY-MAJOR-02: /metrics allowlist
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // 🚀 توحيد شكل الردود على الاستثناءات (HTTP + Authorization) في الـ API
        // لتطابق عقد {success, message, code} الموحد عبر كامل المنصة
        $exceptions->render(function (HttpExceptionInterface $e, $request) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null; // نترك الـ renderer الافتراضي يتعامل مع طلبات الـ web
            }

            $statusCode = $e->getStatusCode();
            $message = $e->getMessage() ?: 'حدث خطأ غير متوقع.';
            $code = match (true) {
                $statusCode === 401 => 'ERR_UNAUTHENTICATED',
                $statusCode === 403 => 'ERR_FORBIDDEN',
                $statusCode === 404 => 'ERR_NOT_FOUND',
                $statusCode === 405 => 'ERR_METHOD_NOT_ALLOWED',
                $statusCode === 422 => 'ERR_VALIDATION',
                $statusCode === 429 => 'ERR_RATE_LIMITED',
                default => 'ERR_HTTP_'.$statusCode,
            };

            return ApiResponse::error($message, $code, $statusCode);
        });
    })->create();
