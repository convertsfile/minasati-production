<?php

namespace App\Services;

use App\Models\PaymentNumber;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class PaymentNumberService
{
    /**
     * 🚀 توزيع أحمال عالمي (Global Round-Robin) باستخدام الـ Cache لضمان توزيع الأموال بالتساوي
     */
    public function getNextNumber(string $provider): ?PaymentNumber
    {
        // 1. جلب الأرقام النشطة وترتيبها (مُكيشة لتقليل استعلامات الـ DB)
        $numbers = Cache::remember("active_payment_numbers_{$provider}", now()->addHour(), function () use ($provider) {
            return PaymentNumber::active()
                ->forProvider($provider)
                ->orderBy('display_order')
                ->get();
        });

        if ($numbers->isEmpty()) {
            Log::emergency("CRITICAL: No active payment numbers available for provider: {$provider}");
            return null;
        }

        // 2. تطبيق خوارزمية الـ Round-Robin العالمية
        $cacheKey = "payment_number_index_{$provider}";

        // استخدام Atomic Increment لمنع تعارض الطلبات المتزامنة (Race Condition)
        $nextIndex = Cache::increment($cacheKey);

        // إعادة العداد للصفر إذا تجاوز عدد الأرقام المتاحة
        $actualIndex = $nextIndex % $numbers->count();

        return $numbers[$actualIndex];
    }

    public function getActiveNumbers(string $provider)
    {
        return PaymentNumber::active()
            ->forProvider($provider)
            ->orderBy('display_order')
            ->get();
    }

    public function getAllProviders(): array
    {
        return ['instapay', 'vodafone_cash'];
    }
}