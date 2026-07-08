<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\CenterCode;
use App\Models\LectureProgress; // 🚀 استدعاء الموديل الصحيح للتدرج
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CenterCodeController extends Controller
{
    public function redeem(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string',
        ]);

        $user = $request->user();
        $code = strtoupper(trim($validated['code']));

        try {
            return DB::transaction(function () use ($user, $code) {
                // 🚀 جلب الكود وقفل الصف بالكامل في الداتا بيز لمنع الهجمات المتزامنة (Race Condition)
                $centerCode = CenterCode::where('code', $code)->lockForUpdate()->first();

                if (!$centerCode) {
                    return ApiResponse::error('الكود غير صحيح. يرجى التأكد والمحاولة مرة أخرى.', 'ERR_INVALID_CODE', 404);
                }

                if ($centerCode->isUsed()) {
                    return ApiResponse::error('هذا الكود تم استخدامه مسبقاً.', 'ERR_CODE_ALREADY_USED', 400);
                }

                // 🚀 دالة مساعدة لتنظيف وفحص الهواتف (Clean Phone Validation)
                if ($centerCode->student_phone && !$this->isAuthorizedPhone($user, $centerCode)) {
                    return ApiResponse::error('هذا الكود مخصص لطالب آخر فقط ولا يمكنك استخدامه.', 'ERR_CODE_UNAUTHORIZED', 403);
                }

                // فحص ما إذا كان الطالب يمتلك الصلاحية مسبقاً
                if ($centerCode->type === 'course') {
                    if ($user->courses()->where('course_id', $centerCode->course_id)->exists()) {
                        return ApiResponse::error('أنت تمتلك صلاحية الوصول لهذا الكورس مسبقاً.', 'ERR_ALREADY_HAS_ACCESS', 400);
                    }
                } elseif ($centerCode->type === 'lecture') {
                    $alreadyUnlocked = LectureProgress::where('user_id', $user->id)
                        ->where('lecture_id', $centerCode->lecture_id)
                        ->whereNotNull('unlocked_at')
                        ->exists();

                    if ($alreadyUnlocked) {
                        return ApiResponse::error('أنت تمتلك صلاحية الوصول لهذه المحاضرة مسبقاً.', 'ERR_ALREADY_HAS_ACCESS', 400);
                    }
                }

                // تسجيل الكود كمُستخدم
                $centerCode->markAsUsed($user->id);

                // منح الصلاحيات بناءً على نوع الكود (التحديث المعماري الصحيح)
                if ($centerCode->type === 'course') {
                    $user->courses()->attach($centerCode->course_id, [
                        'access_type' => 'center_code',
                        'reference' => $code,
                        'granted_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $message = 'تم تفعيل الكود بنجاح! يمكنك الآن مشاهدة الكورس.';

                } elseif ($centerCode->type === 'lecture') {
                    // 🚀 استخدام الجدول المدمج الصحيح للتقدم التعليمي بدلاً من الجدول المحذوف
                    LectureProgress::updateOrCreate(
                        ['user_id' => $user->id, 'lecture_id' => $centerCode->lecture_id],
                        ['unlocked_at' => now()]
                    );

                    // ربط الكورس بشكل مبدئي إذا لم يكن مرتبطاً
                    if (!$user->courses()->where('course_id', $centerCode->course_id)->exists()) {
                        $user->courses()->attach($centerCode->course_id, [
                            'access_type' => 'lecture',
                            'reference' => $code,
                            'granted_at' => now(),
                        ]);
                    }
                    $message = 'تم تفعيل الكود بنجاح! تم فتح المحاضرة لك.';

                } else {
                    // Accumulator code (أكواد التراكمية)
                    if (!$user->courses()->where('course_id', $centerCode->course_id)->exists()) {
                        $user->courses()->attach($centerCode->course_id, [
                            'access_type' => 'accumulator',
                            'reference' => $code,
                            'granted_at' => now(),
                        ]);
                    }
                    $message = 'تم تفعيل الكود بنجاح! تم تجاوز القيود التراكمية لهذا الكورس.';
                }

                Log::info('Center code redeemed', ['user_id' => $user->id, 'code' => $code]);

                return ApiResponse::success([
                    'message' => $message,
                    'course' => [
                        'id' => $centerCode->course->id,
                        'title' => $centerCode->course->title,
                    ],
                ], 'تمت العملية بنجاح');
            });

        } catch (\Exception $e) {
            Log::error('Center code redemption failed', ['user_id' => $user->id, 'code' => $code, 'error' => $e->getMessage()]);
            return ApiResponse::error('حدث خطأ أثناء تفعيل الكود. يرجى المحاولة لاحقاً.', 'ERR_REDEMPTION_FAILED', 500);
        }
    }

    /**
     * دالة مساعدة لتنظيف كود الهواتف من الزحام (Clean Code)
     */
    private function isAuthorizedPhone($user, $centerCode): bool
    {
        $codePhone = trim($centerCode->student_phone);
        $cleanCodePhone = preg_replace('/\D/', '', $codePhone);

        $cleanUserPhone = preg_replace('/\D/', '', $user->phone ?? '');
        $cleanParentPhone = preg_replace('/\D/', '', $user->parent_phone ?? '');
        $studentNum = trim($user->student_number ?? '');

        if ($studentNum !== '' && strcasecmp($studentNum, $codePhone) === 0)
            return true;
        if ($cleanUserPhone !== '' && $cleanUserPhone === $cleanCodePhone)
            return true;
        if ($cleanParentPhone !== '' && $cleanParentPhone === $cleanCodePhone)
            return true;

        return false;
    }
}