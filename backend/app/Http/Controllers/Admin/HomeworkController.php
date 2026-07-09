<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Lecture;
use App\Models\Homework;
use App\Models\HomeworkSubmission;
use App\Services\FileUploadService; // 🚀 لرفع الواجب
use App\Services\BackblazeStorageService; // 🚀 لجلب روابط واجبات الطلاب السحابية
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HomeworkController extends Controller
{
    public function __construct(
        private FileUploadService $fileUploadService,
        private BackblazeStorageService $b2Service
    ) {
    }

    public function storeOrUpdate(Request $request, Lecture $lecture)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'file' => 'nullable|file|mimes:pdf,jpg,jpeg,png,webp|max:20480',
        ]);

        $homework = Homework::where('lecture_id', $lecture->id)->first();

        if ($homework) {
            // حالة التحديث
            $updateData = ['title' => $validated['title']];

            if ($request->hasFile('file')) {
                // مسح الملف القديم من السحابة لتوفير المساحة
                if ($homework->file_path) {
                    $this->fileUploadService->delete($homework->file_path);
                }

                // رفع الملف الجديد للسحابة
                $uploadResult = $this->fileUploadService->upload($request->file('file'), "homeworks/sheets");
                if (!$uploadResult)
                    return ApiResponse::error('فشل في رفع ملف الواجب', 'ERR_UPLOAD_FAILED', 500);

                $updateData['file_path'] = $uploadResult['public_id'];
            }

            $homework->update($updateData);
            $message = 'تم تحديث الواجب بنجاح.';
        } else {
            // حالة الإنشاء
            $request->validate([
                'file' => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:20480',
            ]);

            $uploadResult = $this->fileUploadService->upload($request->file('file'), "homeworks/sheets");
            if (!$uploadResult)
                return ApiResponse::error('فشل في رفع ملف الواجب', 'ERR_UPLOAD_FAILED', 500);

            $homework = Homework::create([
                'lecture_id' => $lecture->id,
                'title' => $validated['title'],
                'file_path' => $uploadResult['public_id'],
            ]);
            $message = 'تم إضافة الواجب بنجاح.';
        }

        return ApiResponse::success([
            'id' => $homework->id,
            'title' => $homework->title,
            // SEC-MAJOR-02: signed URL (10-minute lifetime) for admin viewing.
            'fileUrl' => $this->b2Service->getSignedUrl($homework->file_path, 600),
        ], $message);
    }

    public function pendingSubmissions(Request $request)
    {
        // استخدام الـ Pagination لحماية السيرفر
        $submissions = HomeworkSubmission::where('status', 'pending')
            ->with([
                'user:id,full_name,phone,student_number',
                'homework:id,title,lecture_id',
                'homework.lecture:id,title,course_id',
                'homework.lecture.course:id,title'
            ])
            ->orderBy('created_at', 'asc')
            ->paginate($request->integer('limit', 20));

        $submissions->getCollection()->transform(function ($sub) {
            return [
                'id' => $sub->id,
                'status' => $sub->status,
                // SEC-MAJOR-02: signed URL (10-minute lifetime) for admin viewing.
                'fileUrl' => $sub->file_path ? $this->b2Service->getSignedUrl($sub->file_path, 600) : null,
                'submittedAt' => $sub->created_at->format('Y-m-d H:i:s'),
                'student' => [
                    'id' => $sub->user->id,
                    'fullName' => $sub->user->full_name,
                    'phone' => $sub->user->phone,
                    'studentNumber' => $sub->user->student_number,
                ],
                'homework' => [
                    'id' => $sub->homework->id,
                    'title' => $sub->homework->title,
                ],
                'lecture' => [
                    'id' => $sub->homework->lecture->id,
                    'title' => $sub->homework->lecture->title,
                ],
                'course' => [
                    'id' => $sub->homework->lecture->course->id,
                    'title' => $sub->homework->lecture->course->title,
                ],
            ];
        });

        return ApiResponse::paginated($submissions, 'تم جلب الواجبات المعلقة.');
    }

    public function review(Request $request, HomeworkSubmission $submission)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:approved,rejected',
            'rejection_reason' => 'required_if:status,rejected|nullable|string|max:500',
            'score' => 'nullable|integer|min:0|max:100',
        ]);

        $submission->update([
            'status' => $validated['status'],
            'rejection_reason' => $validated['status'] === 'rejected' ? $validated['rejection_reason'] : null,
            'score' => $validated['status'] === 'approved' ? ($validated['score'] ?? null) : null,
        ]);

        return ApiResponse::success([
            'id' => $submission->id,
            'status' => $submission->status,
            'rejectionReason' => $submission->rejection_reason,
            'score' => $submission->score,
        ], 'تم مراجعة الواجب وتحديث النتيجة بنجاح.');
    }
}