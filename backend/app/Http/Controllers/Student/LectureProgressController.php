<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse; // 🚀 تطبيق الميثاق الموحد
use App\Models\Lecture;
use App\Models\LectureProgress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class LectureProgressController extends Controller
{
    /**
     * 1. جلب نقطة توقف الطالب (لتبدأ المحاضرة منها)
     */
    public function getProgress(Request $request, Lecture $lecture)
    {
        $progress = LectureProgress::where('user_id', $request->user()->id)
            ->where('lecture_id', $lecture->id)
            ->first();

        return ApiResponse::success([
            'watchTime' => $progress ? (float) $progress->watch_time_seconds : 0.0,
            'isCompleted' => $progress ? (bool) $progress->is_completed : false,
            'viewsCount' => $progress ? (int) $progress->views_count : 0,
            'maxViews' => $lecture->max_views,
            'isUnlocked' => $progress && $progress->unlocked_at !== null, // 🚀 تحديث لتتوافق مع الداتابيز الجديدة
        ], 'تم جلب تقدم المحاضرة');
    }

    /**
     * 2. حفظ تقدم الطالب (يتم استدعاؤها كل 15 ثانية من المشغل)
     */
    public function updateProgress(Request $request, Lecture $lecture)
    {
        $validated = $request->validate([
            'watch_time' => 'required|numeric|min:0',
            'total_duration' => 'required|numeric|min:1',
            'stream_id' => 'nullable|string', // 🚀 للتحقق من الجلسات المتزامنة
        ]);

        $user = $request->user();
        $streamId = $validated['stream_id'] ?? null;

        // 🚀 حماية الجلسة: منع تشغيل نفس الفيديو على أكثر من نافذة
        if ($streamId) {
            $cacheKey = "active_stream_user_{$user->id}";
            $activeStream = Cache::get($cacheKey);

            if ($activeStream && $activeStream !== $streamId) {
                // إجبار الفرونت إند على إغلاق المشغل
                return ApiResponse::error('يتم تشغيل هذا الحساب على نافذة أو جهاز آخر حالياً.', 'ERR_STREAM_CONFLICT', 409);
            }
            Cache::put($cacheKey, $streamId, 30);
        }

        $watchTime = (float) $validated['watch_time'];
        $totalDuration = (float) $validated['total_duration'];

        // 🚀 Anti-Cheat: نظام مكافحة تسريع الفيديو (Speed Hack)
        $cacheKeyTracker = "lecture_tracker_{$lecture->id}_user_{$user->id}";
        $tracker = Cache::get($cacheKeyTracker);
        $currentTime = time();

        if ($tracker) {
            $timeElapsed = $currentTime - $tracker['time'];
            $watchTimeDelta = $watchTime - $tracker['watch_time'];

            // السماح بضعف السرعة (2x) + 5 ثواني فرق شبكة
            if ($watchTimeDelta > 0 && $timeElapsed > 0 && ($watchTimeDelta > ($timeElapsed * 2) + 5)) {
                Log::warning("Speed hack detected: User {$user->id} on Lecture {$lecture->id}");
                return ApiResponse::error('تم اكتشاف محاولة تخطي الوقت بصورة غير طبيعية. سيتم إيقاف البث.', 'ERR_SPEED_HACK', 403);
            }
        }

        Cache::put($cacheKeyTracker, ['time' => $currentTime, 'watch_time' => $watchTime], 120);

        // 🚀 هندسة انعدام الثقة (Zero Trust): السيرفر هو من يقرر الاكتمال
        $percentage = ($watchTime / $totalDuration) * 100;
        $isNowCompleted = $percentage >= 90;

        $progress = LectureProgress::firstOrNew([
            'user_id' => $user->id,
            'lecture_id' => $lecture->id,
        ]);

        $progress->watch_time_seconds = $watchTime;

        if ($isNowCompleted) {
            $progress->is_completed = true;
        }

        $progress->save();

        return ApiResponse::success([
            'isCompleted' => $progress->is_completed,
            'watchTime' => $progress->watch_time_seconds
        ], 'تم الحفظ');
    }
}