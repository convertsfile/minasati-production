<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Course;
use App\Models\Lecture;
use App\Models\LectureAttachment;
use App\Services\FileUploadService;
use App\Services\BackblazeStorageService;
use App\Services\InternalJwtService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class LectureController extends Controller
{
    public function __construct(
        private FileUploadService $fileUploadService,
        private BackblazeStorageService $b2Service
    ) {
    }

    public function index(Course $course)
    {
        $lectures = $course->lectures()->with(['attachments', 'homework'])->orderBy('order_index')->get();

        // 🚀 تحويل المرفقات لروابط سحابية صالحة قبل إرسالها للإدارة
        // SEC-MAJOR-02: signed URLs (10-minute lifetime).
        $lectures->transform(function ($lecture) {
            $lecture->attachments->transform(function ($attachment) {
                $attachment->file_url = $attachment->file_path ? $this->b2Service->getSignedUrl($attachment->file_path, 600) : null;
                return $attachment;
            });
            return $lecture;
        });

        return ApiResponse::success($lectures);
    }

    public function store(Request $request, Course $course)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'order_index' => [
                'required',
                'integer',
                'min:1',
                Rule::unique('lectures')->where('course_id', $course->id),
            ],
            'max_views' => ['nullable', 'integer', 'min:1'],
        ]);

        $validated['course_id'] = $course->id;
        $validated['is_locked'] = true;

        $lecture = Lecture::create($validated);

        return ApiResponse::success($lecture, 'تم إضافة المحاضرة بنجاح', 201);
    }

    public function show(Lecture $lecture)
    {
        $lecture->load('attachments');

        $lecture->attachments->transform(function ($attachment) {
            $attachment->file_url = $attachment->file_path ? $this->b2Service->getSignedUrl($attachment->file_path, 600) : null;
            return $attachment;
        });

        return ApiResponse::success($lecture);
    }

    public function update(Request $request, Lecture $lecture)
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'order_index' => [
                'sometimes',
                'integer',
                'min:1',
                Rule::unique('lectures')->where('course_id', $lecture->course_id)->ignore($lecture->id),
            ],
            'is_locked' => ['sometimes', 'boolean'],
            'max_views' => ['nullable', 'integer', 'min:1'],
        ]);

        $lecture->update($validated);

        return ApiResponse::success($lecture, 'تم تحديث بيانات المحاضرة بنجاح');
    }

    public function destroy(Lecture $lecture)
    {
        $lectureId = $lecture->id;

        // 1. أمر الإعدام لمحرك Go (معالجة الفيديو)
        if ($lecture->m3u8_path || $lecture->video_status !== 'pending') {
            try {
                $goUrl = config('services.video.go_url', env('GO_ENGINE_URL')) . '/api/v1/video/' . $lectureId;
                $token = InternalJwtService::issue((string) $lectureId, 'video.delete', 60);
                $response = Http::timeout(5)
                    ->withHeaders(['Authorization' => 'Bearer ' . $token])
                    ->delete($goUrl);

                if (!$response->successful())
                    Log::warning("Go Engine returned non-success on delete lecture {$lectureId}");
            } catch (\Exception $e) {
                Log::error("Go Engine unreachable for lecture {$lectureId}: " . $e->getMessage());
            }

            // محاولة مسح الملفات الخام كإجراء احتياطي عبر حزمة B2 (إن وُجدت)
            try {
                if ($lecture->raw_key)
                    Storage::disk('b2')->delete($lecture->raw_key);
            } catch (\Exception $e) {
            }
        }

        // 2. 🚀 السلاح السري: مسح المرفقات من السحابة لمنع هدر المساحة
        foreach ($lecture->attachments as $attachment) {
            if ($attachment->file_path) {
                $this->fileUploadService->delete($attachment->file_path);
            }
        }

        // مسح المحاضرة
        $lecture->delete();

        return ApiResponse::success(null, 'تم حذف المحاضرة وتدمير جميع ملفات الفيديو والمرفقات المرتبطة بها.');
    }

    public function reorder(Request $request, Course $course)
    {
        $validated = $request->validate([
            'lecture_ids' => ['required', 'array'],
            'lecture_ids.*' => ['integer'],
        ]);

        foreach ($validated['lecture_ids'] as $index => $lectureId) {
            Lecture::where('id', $lectureId)
                ->where('course_id', $course->id)
                ->update(['order_index' => $index + 1]);
        }

        return ApiResponse::success(null, 'تم إعادة ترتيب المحاضرات بنجاح');
    }

    public function destroyVideo(Lecture $lecture)
    {
        if (!$lecture->m3u8_path && $lecture->video_status === 'pending') {
            return ApiResponse::error('لا يوجد فيديو لتدميره', 'ERR_NO_VIDEO', 400);
        }

        try {
            $goUrl = config('services.video.go_url', env('GO_ENGINE_URL')) . '/api/v1/video/' . $lecture->id;
            $token = InternalJwtService::issue((string) $lecture->id, 'video.delete', 60);
            $response = Http::timeout(10)
                ->withHeaders(['Authorization' => 'Bearer ' . $token])
                ->delete($goUrl);
        } catch (\Exception $e) {
            Log::error('Go Engine delete connection failed: ' . $e->getMessage());
        }

        try {
            if ($lecture->raw_key)
                Storage::disk('b2')->delete($lecture->raw_key);
        } catch (\Exception $e) {
        }

        $lecture->update([
            'video_status' => 'pending',
            'm3u8_path' => null,
            'raw_key' => null,
            'encryption_key' => null,
            'video_duration' => null,
            'size_bytes' => 0,
        ]);

        return ApiResponse::success(null, 'تم تدمير الفيديو وإعادة المحاضرة لوضع الانتظار.');
    }

    public function cancelUpload(Lecture $lecture)
    {
        // 🚀 MAJOR FIX: استخدام Storage::disk('b2') مباشرة ليطابق destroyVideo
        // ولكي يعمل Storage::fake('b2') في الاختبارات ويعزل الـ HTTP الحقيقي
        if ($lecture->raw_key) {
            try {
                Storage::disk('b2')->delete($lecture->raw_key);
            } catch (\Exception $e) {
                Log::warning('cancelUpload: failed to delete raw_key from b2: ' . $e->getMessage());
            }
        }

        $lecture->update([
            'video_status' => 'pending',
            'm3u8_path' => null,
            'raw_key' => null,
            'encryption_key' => null,
            'video_duration' => null,
            'size_bytes' => 0,
        ]);

        return ApiResponse::success(null, 'تم إلغاء رفع الفيديو وتنظيف الملفات المؤقتة.');
    }

    public function uploadAttachment(Request $request, $lectureId)
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf,doc,docx,ppt,pptx,jpg,jpeg,png,webp|max:20480',
        ]);

        $lecture = Lecture::findOrFail($lectureId);
        $file = $request->file('file');

        // 🚀 الرفع للسحابة بدلاً من الخادم المحلي
        $uploadResult = $this->fileUploadService->upload($file, "lectures/{$lectureId}/attachments");

        if (!$uploadResult)
            return ApiResponse::error('فشل في إرفاق الملف', 'ERR_UPLOAD_FAILED', 500);

        $attachment = $lecture->attachments()->create([
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $uploadResult['public_id'], // حفظ المفتاح السحابي
            'file_type' => $file->getClientMimeType(),
        ]);

        // إضافة الرابط للرد
        $attachment->file_url = $this->b2Service->getSignedUrl($attachment->file_path, 600);

        return ApiResponse::success($attachment, 'تم إرفاق الملف سحابياً بنجاح', 201);
    }

    public function deleteAttachment(Request $request, $lectureId, $attachmentId)
    {
        $attachment = LectureAttachment::where('id', $attachmentId)
            ->where('lecture_id', $lectureId)
            ->firstOrFail();

        // 🚀 المسح من السحابة أولاً
        if ($attachment->file_path) {
            $this->fileUploadService->delete($attachment->file_path);
        }

        $attachment->delete();

        return ApiResponse::success(null, 'تم حذف المرفق نهائياً.');
    }
}