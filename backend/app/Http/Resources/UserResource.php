<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     * Decouples the Database Model layer from the API Response layer
     * to prevent Information Leakage and IDOR.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'fullName' => $this->full_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'academicYear' => $this->academic_year,
            'studentNumber' => $this->student_number,
            'parentPhone' => $this->parent_phone,
            'school' => $this->school,
            'parentJob' => $this->parent_job,
            'governorate' => $this->governorate,

            // 🚀 دمج رابط الصورة الكامل لتسهيل العرض في تطبيقات الموبايل والويب
            'idImageUrl' => $this->id_image_url,

            'status' => $this->status,
            'walletBalance' => $this->wallet_balance ?? 0,

            // 🚀 تحويلات الـ Boolean الصريحة للحقول الأمنية
            'isBlocked' => (bool) $this->is_blocked,
            'isVerified' => (bool) $this->is_verified,
            'role' => $this->role,

            // SECURITY WARNING: This field is provided for UI conditional rendering ONLY.
            // The frontend MUST NOT trust this field for authorization logic or bypassing restrictions.
            // All secure actions must be validated server-side using middleware and strict policies.
            'isAdmin' => $this->role === 'admin',

            'rejectionReason' => $this->rejection_reason,

            // 🚀 إضافة تاريخ الانضمام منسقاً
            'joinedAt' => $this->created_at ? $this->created_at->format('Y-m-d H:i:s') : null,

            // 🚀 تحميل العلاقات الديناميكية بذكاء (لا يتم تنفيذها إلا إذا طلبها الـ Controller)
            'hasCourses' => $this->whenCounted('courses', fn() => $this->courses_count > 0),
        ];
    }
}