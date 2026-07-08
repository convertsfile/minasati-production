<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\Lecture;
use App\Models\LectureProgress;
use App\Models\Question;
use App\Models\User;
use Illuminate\Http\Request;

class ExamController extends Controller
{
    public function index(Request $request, Lecture $lecture)
    {
        $exams = $lecture->exams()->with('questions')->get();

        return ApiResponse::success($exams);
    }

    public function store(Request $request, Lecture $lecture)
    {
        $validated = $request->validate([
            'form_index' => 'required|integer|min:1|max:3',
            'duration_minutes' => 'required|integer|min:1|max:180',
            'pass_score' => 'required|integer|min:1|max:100',
            'title' => 'nullable|string|max:255',
            'instructions' => 'nullable|string',
            'shuffle_questions' => 'nullable|boolean',
            'shuffle_options' => 'nullable|boolean',
            'max_attempts' => 'nullable|integer|min:0',
            'show_correct_answers' => 'nullable|boolean',
            'show_score' => 'nullable|boolean',
            'per_question_time' => 'nullable|boolean',
            'random_question_count' => 'nullable|integer|min:1',
        ]);

        // Check if exam form already exists for this lecture and form_index
        $existingExam = Exam::where('lecture_id', $lecture->id)
            ->where('form_index', $validated['form_index'])
            ->first();

        if ($existingExam) {
            return ApiResponse::error(
                'Exam form ' . $validated['form_index'] . ' already exists for this lecture',
                'ERR_EXAM_EXISTS',
                400
            );
        }

        $exam = Exam::create([
            'lecture_id' => $lecture->id,
            'form_index' => $validated['form_index'],
            'duration_minutes' => $validated['duration_minutes'],
            'pass_score' => $validated['pass_score'],
            'title' => $validated['title'] ?? null,
            'instructions' => $validated['instructions'] ?? null,
            'shuffle_questions' => $validated['shuffle_questions'] ?? true,
            'shuffle_options' => $validated['shuffle_options'] ?? true,
            'max_attempts' => $validated['max_attempts'] ?? 1,
            'show_correct_answers' => $validated['show_correct_answers'] ?? true,
            'show_score' => $validated['show_score'] ?? true,
            'per_question_time' => $validated['per_question_time'] ?? false,
            'random_question_count' => $validated['random_question_count'] ?? null,
        ]);

        return ApiResponse::success($exam, 'Exam created successfully');
    }

    public function show(Exam $exam)
    {
        $exam->load('questions');

        return ApiResponse::success($exam);
    }

    public function update(Request $request, Exam $exam)
    {
        $validated = $request->validate([
            'duration_minutes' => 'sometimes|integer|min:1|max:180',
            'pass_score' => 'sometimes|integer|min:1|max:100',
        ]);

        $exam->update($validated);

        return ApiResponse::success($exam, 'Exam updated successfully');
    }

    public function destroy(Exam $exam)
    {
        // Delete all questions first
        $exam->questions()->delete();
        $exam->delete();

        return ApiResponse::success(null, 'Exam deleted successfully');
    }

    public function addQuestion(Request $request, Exam $exam)
    {
        $validated = $request->validate([
            'body' => 'required|string',
            'question_type' => 'nullable|in:mcq,multi_select',
            'options' => 'nullable|array|min:2', // 🚀 تصحيح: السماح بخيارين على الأقل (صح/خطأ)
            'options.*' => 'nullable|string',
            'correct_answer' => 'nullable|integer|min:0',
            'correct_answers' => 'nullable|array',
            'correct_answers.*' => 'nullable|integer',
            'image_url' => 'nullable|string',
            'option_images' => 'nullable|array',
            'points' => 'nullable|integer|min:1',
            'time_limit_seconds' => 'nullable|integer|min:10',
        ]);

        $orderIndex = $exam->questions()->max('order_index') ?? 0;
        $validated['order_index'] = $orderIndex + 1;

        $question = $exam->questions()->create($validated);

        return ApiResponse::success($question, 'تم إضافة السؤال بنجاح');
    }

    public function updateQuestion(Request $request, Question $question)
    {
        $validated = $request->validate([
            'body' => 'sometimes|string',
            'options' => 'sometimes|array|min:2', // 🚀 توحيد المعيار مع الإضافة
            'options.*' => 'sometimes|string',
            'correct_answer' => 'sometimes|integer|min:0',
            'order_index' => 'sometimes|integer|min:0',
            'points' => 'sometimes|integer|min:1',
        ]);

        $question->update($validated);
        return ApiResponse::success($question, 'تم تحديث السؤال بنجاح');
    }

    /**
     * 🚀 السلاح السري للإدارة: تقييم نتائج الطلاب بدون انهيار السيرفر (Memory Safe)
     */
    public function studentResults(Request $request, Lecture $lecture)
    {
        $limit = $request->integer('limit', 20);
        $lectureExamsCount = Exam::where('lecture_id', $lecture->id)->count();

        // 🚀 بدلاً من جلب المحاولات كلها، نجلب (الطلاب) الذين امتحنوا فقط ونقسّمهم لصفحات!
        $users = User::whereHas('examAttempts', fn($q) => $q->where('lecture_id', $lecture->id))
            ->with([
                'examAttempts' => function ($q) use ($lecture) {
                    $q->where('lecture_id', $lecture->id)->with('exam')->orderBy('created_at', 'desc');
                }
            ])
            ->paginate($limit);

        $users->getCollection()->transform(function ($user) use ($lectureExamsCount) {
            $userAttempts = $user->examAttempts;

            $passed = $userAttempts->contains('passed', true);
            $failedCount = $userAttempts->where('passed', false)->count();

            $attemptedExamIds = $userAttempts->whereNotNull('completed_at')->pluck('exam_id')->unique();
            $isLockedOut = !$passed && $attemptedExamIds->count() >= $lectureExamsCount;

            return [
                'userId' => $user->id,
                'fullName' => $user->full_name,
                'studentNumber' => $user->student_number,
                'phone' => $user->phone,
                'passed' => $passed,
                'failedCount' => $failedCount,
                'isLockedOut' => $isLockedOut,
                'attempts' => $userAttempts->map(fn($a) => [
                    'id' => $a->id,
                    'formIndex' => $a->exam?->form_index,
                    'score' => $a->score,
                    'passed' => $a->passed,
                    'completedAt' => $a->completed_at?->format('Y-m-d H:i:s'),
                ]),
            ];
        });

        return ApiResponse::paginated($users, 'تم جلب نتائج الطلاب بنجاح');
    }

    /**
     * Instantly unlock the lecture for a specific student without changing exam scores
     */
    public function unlockLecture(Request $request, Lecture $lecture, User $user)
    {
        // 🚀 الإصلاح الجوهري: استخدام unlocked_at بدلاً من is_unlocked
        $progress = LectureProgress::updateOrCreate(
            ['user_id' => $user->id, 'lecture_id' => $lecture->id],
            ['unlocked_at' => now()]
        );

        return ApiResponse::success($progress, 'تم فتح المحاضرة استثنائياً للطالب بنجاح');
    }

    /**
     * Reset all exam attempts for a specific student on a lecture
     */
    public function resetAttempts(Request $request, Lecture $lecture, User $user)
    {
        // 1. مسح محاولات الامتحان
        $examIds = $lecture->exams()->pluck('id');
        ExamAttempt::where('user_id', $user->id)
            ->whereIn('exam_id', $examIds)
            ->delete();

        // 2. 🚀 الإصلاح الجوهري: تصفير تقدم المشاهدة وقفل المحاضرة (unlocked_at)
        $progress = LectureProgress::where('user_id', $user->id)
            ->where('lecture_id', $lecture->id)
            ->first();

        if ($progress) {
            $progress->update([
                'is_completed' => false,
                'unlocked_at' => null, // إعادة القفل
            ]);
        }

        return ApiResponse::success(null, 'تم مسح محاولات الطالب وإعادة قفل المحاضرة بنجاح');
    }

    public function uploadQuestionImage(Request $request, \App\Services\FileUploadService $fileUploadService)
    {
        $request->validate([
            'image' => 'required|file|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $file = $request->file('image');
        $uploadResult = $fileUploadService->upload($file, 'questions');

        if (!$uploadResult) {
            return ApiResponse::error('فشل في رفع الصورة.', 'ERR_UPLOAD_FAILED', 500);
        }

        return ApiResponse::success([
            'publicId' => $uploadResult['public_id'],
            'url' => $uploadResult['url'],
        ], 'تم رفع صورة السؤال بنجاح');
    }
}
