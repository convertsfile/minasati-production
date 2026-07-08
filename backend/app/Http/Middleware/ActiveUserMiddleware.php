<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Http\Responses\ApiResponse;

class ActiveUserMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            // 🚀 الطرد الفوري للمحظورين حتى لو معهم توكن صالح
            if ($user->is_blocked) {
                return ApiResponse::error(
                    'تم حظر حسابك بسبب مخالفة الشروط. يرجى التواصل مع الدعم الفني.',
                    'ERR_USER_BLOCKED',
                    403
                );
            }

            // 🚀 منع الطلاب المرفوضين أو المعلقين من الشراء أو التصفح
            if ($user->status !== 'active' && $user->role !== 'admin') {
                return ApiResponse::error(
                    'حسابك قيد المراجعة أو تم رفضه. لا يمكنك استخدام المنصة حالياً.',
                    'ERR_USER_NOT_ACTIVE',
                    403
                );
            }
        }

        return $next($request);
    }
}