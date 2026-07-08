<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Lecture;
use App\Models\Homework;
use App\Models\HomeworkSubmission;
use App\Services\FileUploadService; // 🚀 لرفع الملفات للسحابة
use App\Services\BackblazeStorageService; // 🚀 لجلب الروابط السحابية
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class HomeworkController extends Controller
{
    public function __construct(
        private FileUploadService $fileUploadService,
        private BackblazeStorageService $b2Service
    ) {
    }

    /**
     * 1. رفع وتسليم حل الواجب
     */
    public function submit(Request $request, Lecture $lecture)
    {
        // 🚀 التأكد من الصلاحية والتدرج التعلمي بسطر واحد!
        Gate::authorize('view', $lecture);

        $homework = Homework::where('lecture_id', $lecture->id)->first();
        if (!$homework) {
            return ApiResponse::error('لا يوجد واجب مطلوب لهذه المحاضرة.', 'ERR_NO_HOMEWORK', 404);
        }

        $user = $request->user();

        // منع رفع الواجب إذا كان هناك واجب "قيد المراجعة" أو "مقبول"
        $existing = HomeworkSubmission::where('user_id', $user->id)
            ->where('homework_id', $homework->id)
            ->whereIn('status', ['pending', 'approved'])
            ->first();

        if ($existing) {
            $msg = $existing->status === 'approved' ? 'تم قبول واجبك مسبقاً.' : 'لديك واجب قيد المراجعة حالياً.';
            return ApiResponse::error($msg, 'ERR_HOMEWORK_EXISTS', 400);
        }

        $request->validate([
            // قبول PDF أو صور بحد أقصى 20 ميجابايت
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:20480',
        ]);

        // 🚀 رفع الملف بأمان إلى السحابة (B2) وليس التخزين المحلي
        $uploadResult = $this->fileUploadService->upload($request->file('file'), "homeworks/student_{$user->id}");

        if (!$uploadResult) {
            return ApiResponse::error('فشل في رفع الملف. يرجى المحاولة لاحقاً.', 'ERR_UPLOAD_FAILED', 500);
        }

        // تسجيل تسليم الواجب
        $submission = HomeworkSubmission::create([
            'user_id' => $user->id,
            'homework_id' => $homework->id,
            'file_path' => $uploadResult['public_id'], // حفظ مفتاح الملف السحابي
            'status' => 'pending',
        ]);

        return ApiResponse::success([
            'submissionId' => $submission->id,
            'status' => $submission->status,
        ], 'تم رفع حل الواجب بنجاح وهو الآن قيد مراجعة المعلم.', 201);
    }

    /**
     * 2. عرض حالة الواجب والمراجعة
     */
    public function status(Request $request, Lecture $lecture)
    {
        Gate::authorize('view', $lecture);

        $homework = Homework::where('lecture_id', $lecture->id)->first();
        if (!$homework) {
            return ApiResponse::success(null, 'لا يوجد واجب لهذه المحاضرة');
        }

        $submission = HomeworkSubmission::where('user_id', $request->user()->id)
            ->where('homework_id', $homework->id)
            ->orderBy('created_at', 'desc')
            ->first();

        // 🚀 تحويل المفاتيح السحابية إلى روابط ديناميكية صالحة
        return ApiResponse::success([
            'homework' => [
                'id' => $homework->id,
                'title' => $homework->title,
                // جلب الرابط من B2
                'fileUrl' => $this->b2Service->getUrl($homework->file_path),
            ],
            'submission' => $submission ? [
                'id' => $submission->id,
                'status' => $submission->status,
                'fileUrl' => $this->b2Service->getUrl($submission->file_path),
                'rejectionReason' => $submission->rejection_reason,
                'score' => $submission->score,
                'submittedAt' => $submission->created_at->format('Y-m-d H:i:s'),
            ] : null
        ], 'تم جلب حالة الواجب');
    }
}