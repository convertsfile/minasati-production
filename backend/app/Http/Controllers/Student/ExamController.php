<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\Lecture;
use App\Services\NotificationService; // 🚀 لإرسال إشعارات النجاح/الرسوب
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;

class ExamController extends Controller
{
    /**
     * 1. جلب الامتحان للطالب (مع حجب الإجابات الصحيحة أمنياً)
     */
    public function getExam(Request $request, Lecture $lecture)
    {
        // 🚀 الاعتماد على הـ Policy التي بنيناها (تفحص الشراء + التدرج التعليمي)
        Gate::authorize('view', $lecture);

        // جلب الامتحان الأساسي للمحاضرة
        $exam = Exam::where('lecture_id', $lecture->id)->orderBy('form_index')->first();

        if (!$exam) {
            return ApiResponse::error('لا يوجد امتحان متاح لهذه المحاضرة حالياً.', 'ERR_NO_EXAM', 404);
        }

        // جلب محاولات الطالب
        $attemptsCount = ExamAttempt::where('user_id', $request->user()->id)
            ->where('exam_id', $exam->id)
            ->count();

        if ($attemptsCount >= $exam->max_attempts) {
            return ApiResponse::error('لقد استنفدت جميع محاولاتك لهذا الامتحان.', 'ERR_MAX_ATTEMPTS', 403);
        }

        $questions = $exam->questions()
            ->when($exam->shuffle_questions, fn($q) => $q->inRandomOrder())
            ->get();

        // 🚨 الدرع الأمني: مسح الإجابات الصحيحة تماماً قبل إرسالها للـ Frontend لمنع الغش
        $secureQuestions = $questions->map(function ($q) use ($exam) {
            $options = $q->options;
            if ($exam->shuffle_options && is_array($options)) {
                shuffle($options); // خلط الخيارات إذا كان مفعلاً
            }

            return [
                'id' => $q->id,
                'body' => $q->body,
                'options' => $options,
                'questionType' => $q->question_type,
                'imageUrl' => $q->image_url,
                'points' => $q->points,
            ];
        });

        return ApiResponse::success([
            'examId' => $exam->id,
            'title' => $exam->title,
            'instructions' => $exam->instructions,
            'durationMinutes' => $exam->duration_minutes,
            'attemptsRemaining' => $exam->max_attempts - $attemptsCount,
            'questions' => $secureQuestions,
        ], 'تم جلب الامتحان بنجاح');
    }

    /**
     * 2. تصحيح الامتحان (Server-Side Evaluation)
     */
    public function submitExam(Request $request, Lecture $lecture)
    {
        Gate::authorize('view', $lecture);

        $validated = $request->validate([
            'exam_id' => 'required|exists:exams,id',
            'answers' => 'required|array', // ['question_id' => 'selected_answer']
        ]);

        $user = $request->user();
        $exam = Exam::findOrFail($validated['exam_id']);

        return DB::transaction(function () use ($user, $lecture, $exam, $validated) {
            // التحقق من عدد المحاولات مرة أخرى (مهم جداً لمنع الـ Race Conditions)
            $attemptsCount = ExamAttempt::where('user_id', $user->id)->where('exam_id', $exam->id)->count();
            if ($attemptsCount >= $exam->max_attempts) {
                return ApiResponse::error('لقد استنفدت محاولاتك.', 'ERR_MAX_ATTEMPTS', 403);
            }

            $questions = $exam->questions->keyBy('id');
            $totalScore = 0;
            $maxPossibleScore = $questions->sum('points');

            // تصحيح الإجابات في السيرفر المغلق
            $formattedAnswers = [];
            foreach ($validated['answers'] as $questionId => $studentAnswer) {
                $q = $questions->get($questionId);
                if ($q) {
                    $isCorrect = (string) $q->correct_answer === (string) $studentAnswer;
                    if ($isCorrect) {
                        $totalScore += $q->points;
                    }
                    $formattedAnswers[] = [
                        'question_id' => $q->id,
                        'student_answer' => $studentAnswer,
                        'is_correct' => $isCorrect
                    ];
                }
            }

            // حساب النسبة المئوية
            $percentage = $maxPossibleScore > 0 ? round(($totalScore / $maxPossibleScore) * 100) : 0;
            $passed = $percentage >= $exam->pass_score;

            // تسجيل المحاولة
            $attempt = ExamAttempt::create([
                'user_id' => $user->id,
                'exam_id' => $exam->id,
                'lecture_id' => $lecture->id,
                'score' => $percentage,
                'passed' => $passed,
                'answers' => $formattedAnswers, // بصيغة JSON
                'completed_at' => now(),
            ]);

            // إرسال إشعار للطالب بالنتيجة
            if ($passed) {
                NotificationService::notifyExamPassed($user, $lecture->title, $percentage);
            } else {
                NotificationService::notifyExamFailed($user, $lecture->title, $percentage, $exam->max_attempts - ($attemptsCount + 1));
            }

            return ApiResponse::success([
                'score' => $percentage,
                'passed' => $passed,
                'passScore' => $exam->pass_score,
                'showAnswers' => $exam->show_correct_answers,
                // إرجاع نموذج التصحيح فقط إذا كانت إعدادات الامتحان تسمح بذلك
                'correction' => $exam->show_correct_answers ? $formattedAnswers : null,
            ], 'تم استلام وتصحيح الامتحان بنجاح.');
        });
    }

    public function history(Request $request, Lecture $lecture)
    {
        Gate::authorize('view', $lecture);

        $attempts = ExamAttempt::where('user_id', $request->user()->id)
            ->where('lecture_id', $lecture->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return ApiResponse::success($attempts->map(fn($a) => [
            'id' => $a->id,
            'score' => $a->score,
            'passed' => $a->passed,
            'completedAt' => $a->completed_at?->format('Y-m-d H:i:s'),
        ]), 'تم جلب سجل المحاولات');
    }

    public function myAttempts(Request $request)
    {
        $user = $request->user();

        // جلب المحاولات مع بيانات الامتحان والمحاضرة والكورس
        $attempts = ExamAttempt::where('user_id', $user->id)
            ->with([
                'exam',
                'exam.lecture' => function ($q) {
                    $q->select('id', 'title', 'course_id'); },
                'exam.lecture.course' => function ($q) {
                    $q->select('id', 'title'); }
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        // تشكيل البيانات لتطابق ما ينتظره الفرونت إند
        $formattedAttempts = $attempts->map(function ($attempt) {
            return [
                'id' => $attempt->id,
                'lectureId' => $attempt->exam->lecture_id ?? null,
                'courseTitle' => $attempt->exam->lecture->course->title ?? 'غير محدد',
                'lectureTitle' => $attempt->exam->lecture->title ?? 'غير محدد',
                'formIndex' => $attempt->exam->form_index ?? 1,
                'score' => $attempt->score ?? 0,
                'passed' => $attempt->passed ?? false,
                'completedAt' => $attempt->created_at,
            ];
        });

        return response()->json(['data' => $formattedAttempts]);
    }
}