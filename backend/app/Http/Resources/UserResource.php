<?php

namespace App\Http\Resources;

use App\Services\BackblazeStorageService;
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
        // SEC-MAJOR-02: the id_image column stores a storage KEY, not a URL.
        // The historical setup stored an unsigned B2 URL in id_image_url,
        // which let anyone with the link access the ID card. The new
        // behaviour: id_image_url is a 5-minute signed URL computed
        // fresh on every response (so it cannot be cached or shared).
        //
        // We also authorise: only admins should be able to see ID cards
        // (the resource is the only place this filter is applied).
        $viewer = $request->user();
        $isAdminViewer = $viewer && $viewer->role === 'admin';

        $signedIdImageUrl = null;
        if ($isAdminViewer && ! empty($this->id_image)) {
            $signedIdImageUrl = app(BackblazeStorageService::class)
                ->getSignedUrl($this->id_image, 300);
        }

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

            // 🚀 Signed URL computed per-request (admin only).
            'idImageUrl' => $signedIdImageUrl,

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
