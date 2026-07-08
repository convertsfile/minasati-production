<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Models\Course;
use App\Models\Lecture;
use App\Models\ExamAttempt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class StudentMonitoringController extends Controller
{
    public function index(Request $request)
    {
        $flaggedStudents = [];

        // 🚀 الأداء الخارق (Enterprise Performance):
        // استخدام chunk لمعالجة 100 طالب في كل دورة لمنع انهيار الـ RAM
        User::where('role', 'student')
            ->where('status', 'active')
            ->where('is_blocked', false)
            ->with([
                'courses' => function ($q) {
                    $q->withPivot('id', 'created_at', 'monitoring_grace_until');
                }
            ])
            ->chunk(100, function ($students) use (&$flaggedStudents) {

                $studentIds = $students->pluck('id');
                $courseIds = $students->flatMap->courses->pluck('id')->unique();

                // 🚀 تحميل كل المحاضرات والامتحانات للكورسات المطلوبة مرة واحدة فقط (O(1) Queries)
                $allLectures = Lecture::whereIn('course_id', $courseIds)->with('exams')->get()->groupBy('course_id');
                $allAttempts = ExamAttempt::whereIn('user_id', $studentIds)->get()->groupBy('user_id');
                $allCompletedProgress = DB::table('lecture_progress')
                    ->whereIn('user_id', $studentIds)
                    ->where('is_completed', true)
                    ->get()
                    ->groupBy('user_id');

                foreach ($students as $student) {
                    $studentAttempts = $allAttempts->get($student->id) ?? collect();
                    $studentCompletedLectures = $allCompletedProgress->get($student->id) ?? collect();
                    $completedLectureIds = $studentCompletedLectures->pluck('lecture_id')->toArray();

                    foreach ($student->courses as $course) {
                        $pivot = $course->pivot;

                        // 1. تجاوز فترة السماح
                        if ($pivot->monitoring_grace_until && Carbon::parse($pivot->monitoring_grace_until)->isFuture()) {
                            continue;
                        }

                        $issues = [];
                        $courseLectures = $allLectures->get($course->id) ?? collect();

                        // 2. فحص الرسوب المتكرر في الامتحانات
                        foreach ($courseLectures as $lecture) {
                            $lectureExams = $lecture->exams;
                            if ($lectureExams->isEmpty())
                                continue;

                            $attemptsForLecture = $studentAttempts->where('lecture_id', $lecture->id);
                            if ($attemptsForLecture->isEmpty())
                                continue;

                            $hasPassed = $attemptsForLecture->contains('passed', true);
                            $attemptedExamIds = $attemptsForLecture->whereNotNull('completed_at')->pluck('exam_id')->unique();

                            if (!$hasPassed && $attemptedExamIds->count() >= $lectureExams->count()) {
                                $issues[] = [
                                    'type' => 'exam_failed',
                                    'courseId' => $course->id,
                                    'courseTitle' => $course->title,
                                    'lectureId' => $lecture->id,
                                    'lectureTitle' => $lecture->title,
                                    'attempts' => $attemptsForLecture->map(fn($a) => [
                                        'id' => $a->id,
                                        'formIndex' => $lectureExams->firstWhere('id', $a->exam_id)?->form_index ?? 1,
                                        'score' => $a->score,
                                        'passed' => (bool) $a->passed,
                                        'completedAt' => $a->completed_at?->format('Y-m-d H:i:s'),
                                    ])->values()->toArray(),
                                ];
                            }
                        }

                        // 3. فحص تراكم المحاضرات غير المشاهدة
                        $subscriptionDate = Carbon::parse($pivot->created_at);
                        if ($subscriptionDate->diffInDays(now()) >= 7) {
                            $uncompletedLectures = $courseLectures->filter(fn($lecture) => !in_array($lecture->id, $completedLectureIds));

                            if ($uncompletedLectures->count() >= 2) {
                                $issues[] = [
                                    'type' => 'accumulation',
                                    'courseId' => $course->id,
                                    'courseTitle' => $course->title,
                                    'missedCount' => $uncompletedLectures->count(),
                                    'missedLectures' => $uncompletedLectures->map(fn($l) => [
                                        'id' => $l->id,
                                        'title' => $l->title,
                                    ])->values()->toArray(),
                                ];
                            }
                        }

                        if (!empty($issues)) {
                            $flaggedStudents[] = [
                                'studentId' => $student->id,
                                'fullName' => $student->full_name,
                                'phone' => $student->phone,
                                'parentPhone' => $student->parent_phone,
                                'studentNumber' => $student->student_number,
                                'academicYear' => $student->academic_year,
                                'courseId' => $course->id,
                                'courseTitle' => $course->title,
                                'subscriptionId' => $pivot->id,
                                'issues' => $issues,
                            ];
                        }
                    }
                }
            });

        return ApiResponse::success($flaggedStudents, 'تم جلب قائمة الطلاب المتعثرين بنجاح');
    }

    public function extendGrace(Request $request)
    {
        $validated = $request->validate([
            'student_id' => 'required|integer|exists:users,id',
            'course_id' => 'required|integer|exists:courses,id',
            'days' => 'required|integer|min:1|max:90',
        ]);

        $updated = DB::table('course_student')
            ->where('student_id', $validated['student_id'])
            ->where('course_id', $validated['course_id'])
            ->update([
                'monitoring_grace_until' => Carbon::now()->addDays($validated['days']),
                'updated_at' => Carbon::now(),
            ]);

        if ($updated) {
            return ApiResponse::success(null, 'تم تمديد فترة السماح بنجاح');
        }

        return ApiResponse::error('الاشتراك غير موجود', 'ERR_NOT_FOUND', 404);
    }

    public function reviewAttempt(ExamAttempt $attempt)
    {
        $attempt->load(['user', 'exam.questions']);
        $exam = $attempt->exam;
        $questions = $exam ? $exam->questions : collect();

        $answersMap = collect($attempt->answers)->pluck('student_answer', 'question_id')->toArray();

        return ApiResponse::success([
            'id' => $attempt->id,
            'studentName' => $attempt->user->full_name,
            'examTitle' => $exam?->title,
            'score' => $attempt->score,
            'passed' => (bool) $attempt->passed,
            'completedAt' => $attempt->completed_at?->format('Y-m-d H:i:s'),
            'questions' => $questions->map(fn($q) => [
                'id' => $q->id,
                'body' => $q->body,
                'options' => $q->options,
                'correctAnswer' => $q->correct_answer,
                'selectedAnswer' => $answersMap[$q->id] ?? null,
            ]),
        ], 'تم جلب تفاصيل محاولة الامتحان');
    }
}