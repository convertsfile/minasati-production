<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CourseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // 1. جلب المستخدم الحالي بشكل آمن
        $user = auth('sanctum')->user();

        // 2. التحقق مما إذا كان المستخدم يمتلك الكورس
        $isPurchased = false;
        if ($user) {
            $isPurchased = $user->courses()->where('course_id', $this->id)->exists();
        }

        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'pricePoints' => $this->price_points, // أو price_points حسب التسمية لديك
            'academicYear' => $this->academic_year,
            'validityDate' => $this->validity_date,
            'status' => $this->status,
            'isPublished' => $this->status === 'published',
            'isStrictOrder' => $this->is_strict_order,
            'thumbnailUrl' => $this->thumbnail_url,
            'createdAt' => $this->created_at ? $this->created_at->format('Y-m-d H:i:s') : null,

            // 🚀 السطر الذي سيحل المشكلة بالكامل ويرسل حالة الشراء للفرونت إند
            'isPurchased' => $isPurchased,

            // إرسال الإحصائيات إذا تم طلبها عبر withCount في الـ Controller
            'lecturesCount' => $this->whenCounted('lectures'),
            'studentsCount' => $this->whenCounted('students'),

            // جلب المحاضرات وتمريرها
            'lectures' => LectureResource::collection($this->whenLoaded('lectures')),
        ];
    }
}