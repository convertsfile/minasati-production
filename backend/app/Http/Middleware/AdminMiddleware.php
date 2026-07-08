<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Http\Responses\ApiResponse; // 🚀 استدعاء الميثاق
use Illuminate\Support\Facades\Log;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // 🚀 الاعتماد على حقل role بشكل صريح بدلاً من is_admin
        if (!$user || $user->role !== 'admin') {
            Log::warning('Admin access denied', [
                'user_id' => $user?->id,
                'role' => $user?->role,
                'ip' => $request->ip()
            ]);

            // 🚀 استخدام الهيكل القياسي للردود
            return ApiResponse::error(
                'غير مصرح لك بالوصول إلى هذه الموارد. صلاحيات إدارة مطلوبة.',
                'ERR_FORBIDDEN',
                403
            );
        }

        return $next($request);
    }
}