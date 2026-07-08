<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Lecture;
use App\Models\User;
use App\Models\VideoViolation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class VideoViolationController extends Controller
{
    private const FATAL_VIOLATIONS = ['devtools', 'screen_recording'];
    private const WARNING_VIOLATIONS = ['screenshot'];

    // المخالفات التي نتجاهلها في الداتا بيز لمنع امتلاء المساحة (DB Bloat)
    private const IGNORED_VIOLATIONS = ['tab_switch'];

    private const BASE_STRIKES = 3;

    private function getMaxStrikes(User $user): int
    {
        // كلما سامحت الإدارة الطالب (unblock_count)، زاد حده الأقصى
        return self::BASE_STRIKES + ($user->unblock_count * self::BASE_STRIKES);
    }

    /**
     * 1. تسجيل المخالفة واتخاذ إجراءات الردع
     */
    public function log(Request $request, Lecture $lecture)
    {
        $validated = $request->validate([
            'violation_type' => 'required|in:screenshot,screen_recording,devtools,tab_switch',
        ]);

        $user = $request->user();

        // 🚀 حماية للأداء: إذا كان محظوراً مسبقاً لا ترهق السيرفر
        if ($user->is_blocked) {
            return ApiResponse::error('الحساب محظور بالفعل.', 'ERR_USER_BLOCKED', 403);
        }

        $violationType = $validated['violation_type'];

        try {
            // 🚀 حماية مساحة قاعدة البيانات: لا نسجل tab_switch لأنه يحدث كثيراً بالخطأ
            if (!in_array($violationType, self::IGNORED_VIOLATIONS)) {
                VideoViolation::create([
                    'user_id' => $user->id,
                    'lecture_id' => $lecture->id,
                    'violation_type' => $violationType,
                    'user_agent' => $request->userAgent(),
                    'ip_address' => $request->ip(),
                ]);
            }

            // حساب المخالفات القاتلة (الفعلية)
            $fatalStrikes = VideoViolation::where('user_id', $user->id)
                ->whereIn('violation_type', self::FATAL_VIOLATIONS)
                ->count();

            $isFatal = in_array($violationType, self::FATAL_VIOLATIONS);
            $maxStrikes = $this->getMaxStrikes($user);
            $shouldBlock = $fatalStrikes >= $maxStrikes;

            $warningMessage = null;

            if ($shouldBlock && $isFatal) {
                // 1. تحديث حالة الحساب مع كتابة السبب للإدارة
                $user->update([
                    'is_blocked' => true,
                    'status' => 'blocked',
                    'rejection_reason' => 'حظر أمني تلقائي: تم رصد محاولات متكررة لتصوير الشاشة أو فتح أدوات المطورين.'
                ]);

                // 🚀 2. الطرد الفوري! تدمير التوكن لقطع البث في نفس اللحظة
                $user->currentAccessToken()->delete();

                Log::critical("Security Alert: User {$user->id} blocked due to max fatal strikes.", [
                    'strikes' => $fatalStrikes,
                    'max_strikes' => $maxStrikes,
                    'lecture_id' => $lecture->id,
                ]);

                $warningMessage = 'تم حظر حسابك وتسجيل خروجك لتجاوز الحد الأقصى للمخالفات الأمنية.';

            } elseif ($fatalStrikes == ($maxStrikes - 1) && $isFatal) {
                // تحذير ما قبل الحظر
                $warningMessage = 'تحذير أخير ⚠️: رصدنا محاولة تسجيل شاشة. مخالفة أخرى ستؤدي لحظر حسابك نهائياً ولن تتمكن من استرداد أموالك.';
            } elseif (!$isFatal && $violationType === 'screenshot') {
                // تحذير خفيف
                $warningMessage = 'تحذير ⚠️: أخذ لقطات شاشة (Screenshots) يخالف سياسة المنصة ويعرض حسابك للخطر.';
            }

            return ApiResponse::success([
                'fatalStrikes' => $fatalStrikes,
                'shouldBlock' => ($shouldBlock && $isFatal),
                'isWarningOnly' => !$isFatal,
                'warningMessage' => $warningMessage,
            ], 'تم تقييم الحالة الأمنية');

        } catch (\Exception $e) {
            Log::error('Failed to log video violation', [
                'user_id' => $user->id,
                'lecture_id' => $lecture->id,
                'error' => $e->getMessage(),
            ]);

            // 🚀 هندسة انعدام المعرفة (Zero-Knowledge Proof)
            // إذا فشل السيرفر في التسجيل، نرجع نجاح وهمي لكي لا يعرف المخترق أن محاولته للتهرب قد نجحت
            return ApiResponse::success(['logged' => true]);
        }
    }

    /**
     * 2. جلب إحصائيات المخالفات للطالب (لعرض شريط تحذيري في واجهته مثلاً)
     */
    public function count(Request $request)
    {
        $user = $request->user();

        $fatalStrikes = VideoViolation::where('user_id', $user->id)
            ->whereIn('violation_type', self::FATAL_VIOLATIONS)
            ->count();

        $analyticsWarnings = VideoViolation::where('user_id', $user->id)
            ->whereIn('violation_type', self::WARNING_VIOLATIONS)
            ->count();

        return ApiResponse::success([
            'fatalStrikes' => $fatalStrikes,
            'analyticsWarnings' => $analyticsWarnings,
            'isBlocked' => $fatalStrikes >= $this->getMaxStrikes($user),
            'maxStrikes' => $this->getMaxStrikes($user),
        ], 'تم جلب عداد المخالفات');
    }
}