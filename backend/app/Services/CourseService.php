<?php

namespace App\Services;

use App\Models\Course;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception; // 🚀 استخدام الـ Exception القياسي

class CourseService
{
    public function __construct(
        private WalletService $walletService
    ) {
    }

    public function purchaseCourse(User $user, Course $course): void
    {
        // 🚀 1. حماية الـ Business Logic: لا نسمح بالشراء إلا للحسابات المفعلة وغير المحظورة
        if ($user->status !== 'active' || $user->is_blocked) {
            throw new Exception('لا يمكن إتمام الشراء. حسابك غير مفعل أو تم حظره.', 403);
        }

        DB::transaction(function () use ($user, $course) {
            $lockedUser = User::where('id', $user->id)->lockForUpdate()->first();

            // هل يمتلك الكورس مسبقاً؟
            if ($lockedUser->courses()->where('course_id', $course->id)->exists()) {
                throw new Exception('أنت تمتلك هذا الكورس بالفعل.', 400);
            }

            // 🚀 إنشاء رقم مرجعي موحد للعملية المالية والصلاحية معاً
            $reference = "COURSE_PURCHASE_{$course->id}_" . now()->timestamp;

            // الخصم من المحفظة (اللوجيك المالي)
            if ($course->price_points > 0) {
                if ($lockedUser->wallet_balance < $course->price_points) {
                    throw new Exception('رصيد المحفظة غير كافٍ. يرجى شحن الرصيد أولاً.', 400);
                }

                // سيقوم الـ WalletService بتوثيق العملية المالية
                $this->walletService->deduct(
                    $lockedUser,
                    $course->price_points,
                    "شراء كورس: {$course->title}",
                    $reference, // ربط نفس الرقم المرجعي
                    ['course_id' => $course->id]
                );
            }

            // 🚀 2. منح الصلاحية مع التوثيق الكامل (Audit Trail)
            $lockedUser->courses()->attach($course->id, [
                'access_type' => 'purchase', // تم التصحيح ليكون متوافقاً مع الـ Database Enum
                'reference' => $reference,   // توثيق الرقم المرجعي لحل أي نزاعات مستقبلاً
                'granted_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            Log::info('Course purchased successfully', [
                'user_id' => $lockedUser->id,
                'course_id' => $course->id,
                'price' => $course->price_points,
                'reference' => $reference
            ]);
        }, 3);
    }
}