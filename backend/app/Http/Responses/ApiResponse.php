<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;

class ApiResponse
{
    /**
     * استجابة النجاح القياسية
     */
    public static function success(mixed $data = null, string $message = 'Success', int $status = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $status);
    }

    /**
     * استجابة الفشل القياسية
     * 🚀 تم توحيد 'message' وتمت إضافة 'errors' للتعامل مع أخطاء الـ Validation
     */
    public static function error(string $message, string $code = 'ERR_INTERNAL', int $status = 400, mixed $errors = null): JsonResponse
    {
        $response = [
            'success' => false,
            'message' => $message, // تم التوحيد لتسهيل قراءته في الـ Frontend
            'code' => $code,
        ];

        // إرفاق تفاصيل الأخطاء الإضافية (إن وجدت) مثل أخطاء الفورم
        if ($errors !== null) {
            $response['errors'] = $errors;
        }

        return response()->json($response, $status);
    }

    /**
     * استجابة البيانات المجدولة (Paginated)
     * 🚀 أصبحت تستقبل كائن الـ Paginator مباشرة لتنظيف الـ Controllers
     */
    public static function paginated(LengthAwarePaginator $paginator, string $message = 'Success'): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $paginator->items(), // البيانات الفعلية
            'meta' => [
                'total' => $paginator->total(),
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }
}