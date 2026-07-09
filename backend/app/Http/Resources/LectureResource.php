<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Gate;

class LectureResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        // 🚀 فحص الصلاحية الأمني قبل إرسال روابط البث الحساسة
        $user = auth('sanctum')->user();
        $isAuthorized = false;
        if ($user) {
            $isAuthorized = Gate::forUser($user)->allows('view', $this->resource);
        }

        $isUnlocked = false;
        if (!$this->is_locked) {
            $isUnlocked = true;
        } elseif ($user) {
            $isUnlocked = $isAuthorized;
        }

        return [
            'id' => $this->id,
            'courseId' => $this->course_id,
            'title' => $this->title,
            'description' => $this->description,
            'orderIndex' => $this->order_index,
            'isLocked' => (bool) $this->is_locked,
            'isUnlocked' => (bool) $isUnlocked,
            'videoDuration' => $this->video_duration, // بالثواني
            'maxViews' => $this->max_views,

            // حالة معالجة الفيديو (مفيدة لواجهة الأدمن للتحقق من اكتمال الـ Encoding)
            'videoStatus' => $this->video_status,
            'encodingStatus' => $this->encoding_status,
            'isEncoded' => (bool) $this->is_encoded,

            // 🚀 درع الحماية: روابط ومسارات بث الفيديو لا تظهر إلا إذا كان الطالب يمتلك صلاحية الشراء والتدرج الفعلي
            'streaming' => $this->when($isAuthorized, function () {
                // هنا نعتمد على الـ Signed URL المؤمن بمدة صلاحية قصيرة (مثل ساعة واحدة) من Backblaze B2
                // لمنع تحميل الفيديوهات أو تسريب الروابط الدائمة
                $b2Service = app(\App\Services\BackblazeStorageService::class);

                return [
                    'hlsUrl' => $this->b2_hls_path ? $b2Service->getSignedUrl($this->b2_hls_path, 3600) : null,
                    'videoUrl' => $this->b2_video_path ? $b2Service->getSignedUrl($this->b2_video_path, 3600) : null,
                ];
            }),

            // 🚀 تحميل المرفقات والواجبات بشكل مشروط (فقط إذا تم عمل eager loading لها في الـ Controller)
            'attachments' => $this->whenLoaded('attachments'),
            'homework' => $this->whenLoaded('homework'),

            'createdAt' => $this->created_at ? $this->created_at->format('Y-m-d H:i:s') : null,
        ];
    }
}