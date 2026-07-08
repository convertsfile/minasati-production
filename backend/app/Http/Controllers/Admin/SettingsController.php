<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Setting;
use App\Models\User;
use App\Services\PlanService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SettingsController extends Controller
{
    public function get()
    {
        return ApiResponse::success([
            // 🚀 تحويل المفاتيح لـ CamelCase
            'whatsappNumber' => Setting::getValue('whatsapp_number', '201000000000'),
        ], 'تم جلب الإعدادات بنجاح');
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'whatsapp_number' => 'required|string|max:20',
        ]);

        Setting::setValue('whatsapp_number', $validated['whatsapp_number']);

        Log::info('WhatsApp number updated', ['admin_id' => auth()->id()]);

        return ApiResponse::success(null, 'تم تحديث الإعدادات بنجاح');
    }

    public function limits()
    {
        $planLimits = PlanService::getCurrentPlanLimits();
        $currentPlanName = PlanService::getCurrentPlan();

        // حساب عدد الطلاب
        $totalStudents = User::where('role', 'student')->count();

        // 🚀 حساب المساحة سريع جداً لأنه يقرأ من الـ Cache الذي بنيناه في PlanService
        $storageUsed = PlanService::getStorageUsedBytes();

        $maxStorageBytes = $planLimits['storage_gb'] * 1024 * 1024 * 1024;

        $studentsPercentage = $planLimits['students'] > 0 ? ($totalStudents / $planLimits['students']) * 100 : 0;
        $storagePercentage = $maxStorageBytes > 0 ? ($storageUsed / $maxStorageBytes) * 100 : 0;

        return ApiResponse::success([
            'plan' => $currentPlanName,
            'planName' => $planLimits['name'],
            'students' => [
                'current' => $totalStudents,
                'max' => $planLimits['students'],
                'percentage' => round($studentsPercentage, 2),
            ],
            'storage' => [
                'currentBytes' => $storageUsed, // 🚀 CamelCase
                'maxBytes' => $maxStorageBytes, // 🚀 CamelCase
                'percentage' => round($storagePercentage, 2),
            ],
            'warning' => ($studentsPercentage >= 80 || $storagePercentage >= 80),
        ], 'تم جلب بيانات استهلاك الباقة بنجاح');
    }
}