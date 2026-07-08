<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $notifications = Notification::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        $mapped = $notifications->map(fn($n) => [
            'id' => $n->id,
            'type' => $n->type,
            'title' => $n->title,
            'message' => $n->message,
            'isRead' => $n->read_at !== null,
            'createdAt' => $n->created_at->format('Y-m-d H:i:s'),
        ]);

        $unreadCount = Notification::where('user_id', $user->id)
            ->whereNull('read_at')
            ->count();

        // 🚀 الاستفادة من الـ Success لأننا نرسل بيانات مختلطة (Pagination + Counters)
        return ApiResponse::success([
            'notifications' => $mapped,
            'unreadCount' => $unreadCount,
            'pagination' => [
                'total' => $notifications->total(),
                'currentPage' => $notifications->currentPage(),
                'lastPage' => $notifications->lastPage(),
            ],
        ], 'تم جلب الإشعارات');
    }

    public function markAsRead(Request $request, Notification $notification)
    {
        if ($notification->user_id !== $request->user()->id) {
            return ApiResponse::error('Unauthorized', 'ERR_UNAUTHORIZED', 403);
        }

        $notification->update(['read_at' => now()]);

        return ApiResponse::success(null, 'تم تحديد الإشعار كمقروء');
    }

    public function markAllAsRead(Request $request)
    {
        Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return ApiResponse::success(null, 'تم تحديد جميع الإشعارات كمقروءة');
    }
}