<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class DeviceManagerService
{
    const MAX_DEVICES = 5; // الحد الأقصى للأجهزة النشطة في نفس الوقت
    const MAX_NEW_DEVICES_PER_MONTH = 3; // 🚀 رقم عادل (هاتف، لابتوب، تابلت) في الشهر

    public function handleDeviceLogin(User $user, $deviceId, $deviceName)
    {
        // 🚀 استخدام Transaction لمنع ثغرات الـ Race Conditions عند تسجيل دخول متزامن
        return DB::transaction(function () use ($user, $deviceId, $deviceName) {

            // قفل صف المستخدم حتى تنتهي العملية لمنع تخطي الحدود
            $lockedUser = User::where('id', $user->id)->lockForUpdate()->first();

            // 1. هل الجهاز مسجل مسبقاً؟
            $existingDevice = $lockedUser->devices()->where('device_id', $deviceId)->first();

            if ($existingDevice) {
                $existingDevice->update([
                    'last_active_at' => now(),
                    'device_name' => $deviceName // تحديث الاسم في حال تم تغييره
                ]);
                return ['status' => 'allowed'];
            }

            // 2. درع الحماية الأمني (Churn Guard) العادل
            // نحسب كم جهاز جديد تمت إضافته في آخر 30 يوم
            $recentDevicesAdded = $lockedUser->devices()
                ->where('created_at', '>', now()->subDays(30))
                ->count();

            if ($recentDevicesAdded >= self::MAX_NEW_DEVICES_PER_MONTH) {
                // 🚀 العدل: لا نحظر حساب الطالب، بل نمنعه من إضافة هذا الجهاز فقط
                return [
                    'status' => 'monthly_limit_reached',
                    'message' => 'لقد استنفدت الحد الأقصى لإضافة أجهزة جديدة هذا الشهر (3 أجهزة). يرجى المحاولة الشهر القادم.'
                ];
            }

            // 3. التحقق من امتلاء المقاعد (الحد الأقصى الكلي)
            if ($lockedUser->devices()->count() >= self::MAX_DEVICES) {
                return [
                    'status' => 'limit_reached',
                    'message' => 'لقد وصلت للحد الأقصى من الأجهزة المسموح بها (5/5). يرجى إزالة جهاز قديم من الإعدادات.',
                ];
            }

            // 4. تسجيل الجهاز الجديد بنجاح
            $lockedUser->devices()->create([
                'device_id' => $deviceId,
                'device_name' => $deviceName,
                'last_active_at' => now(),
            ]);

            return ['status' => 'allowed'];
        });
    }
}