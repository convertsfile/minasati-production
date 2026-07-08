<?php

namespace App\Services;

use App\Models\Lecture;
use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

class PlanService
{
    public const PLAN_STARTUP = 'startup';
    public const PLAN_GROWTH = 'growth';
    public const PLAN_PROFESSIONAL = 'professional';

    public static function getPlans(): array
    {
        return [
            self::PLAN_STARTUP => [
                'name' => 'باقة النشأة',
                'students' => 150,
                'storage_gb' => 30,
                'qualities' => ['480p'],
            ],
            self::PLAN_GROWTH => [
                'name' => 'باقة النمو',
                'students' => 500,
                'storage_gb' => 100,
                'qualities' => ['480p'],
            ],
            self::PLAN_PROFESSIONAL => [
                'name' => 'باقة الاحتراف',
                'students' => 1000,
                'storage_gb' => 250,
                'qualities' => ['480p', '720p'],
            ],
        ];
    }

    public static function getCurrentPlan(): string
    {
        return Setting::getValue('platform_plan', self::PLAN_STARTUP);
    }

    public static function getCurrentPlanLimits(): array
    {
        $plan = self::getCurrentPlan();
        $plans = self::getPlans();

        return $plans[$plan] ?? $plans[self::PLAN_STARTUP];
    }

    /**
     * 🚀 أداء فائق: الاعتماد على الكاش بدلاً من عملية الـ SUM المكلفة في قاعدة البيانات
     */
    public static function getStorageUsedBytes(): int
    {
        return Cache::rememberForever('total_storage_used_bytes', function () {
            return (int) Lecture::sum('size_bytes');
        });
    }

    /**
     * 🚀 دالة استباقية للتحقق من السماح برفع فيديوهات جديدة
     */
    public static function canUploadNewVideo(int $newFileSizeBytes = 0): bool
    {
        $limits = self::getCurrentPlanLimits();
        $maxStorageBytes = $limits['storage_gb'] * 1024 * 1024 * 1024; // تحويل الجيجا إلى بايت

        $currentUsed = self::getStorageUsedBytes();

        return ($currentUsed + $newFileSizeBytes) <= $maxStorageBytes;
    }
}