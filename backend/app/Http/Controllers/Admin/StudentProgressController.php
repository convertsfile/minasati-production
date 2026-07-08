<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse; // 🚀 تطبيق الميثاق الموحد
use App\Models\User;
use Illuminate\Http\Request;

class StudentProgressController extends Controller
{
    public function index(Request $request)
    {
        $limit = $request->integer('limit', 20);

        $students = User::where(fn($q) => $q->where('role', 'student')->orWhereNull('role'))
            ->withCount([
                'videoViolations',
                'lectureProgresses as completed_lectures_count' => fn($q) => $q->where('is_completed', true),
                'examAttempts as passed_exams_count' => fn($q) => $q->where('passed', true),
                'examAttempts as failed_exams_count' => fn($q) => $q->where('passed', false),
            ])
            ->orderBy('created_at', 'desc')
            ->paginate($limit);

        // 🚀 استخدام transform على الـ Paginator لتهيئة البيانات
        $students->getCollection()->transform(fn($user) => [
            'id' => $user->id,
            'fullName' => $user->full_name,
            'phone' => $user->phone,
            'studentNumber' => $user->student_number,
            'status' => $user->status,
            'walletBalance' => $user->wallet_balance,
            'violationsCount' => $user->video_violations_count,
            'completedLectures' => $user->completed_lectures_count,
            'passedExams' => $user->passed_exams_count,
            'failedExams' => $user->failed_exams_count,
        ]);

        // 🚀 الرد بميثاق الـ Pagination
        return ApiResponse::paginated($students, 'تم جلب تقدم الطلاب بنجاح');
    }

    public function show(User $user)
    {
        // 🚀 حل مشكلة N+1 في الإحصائيات الفردية
        $user->loadCount(['videoViolations']);
        $user->loadSum(['walletTransactions' => fn($q) => $q->where('type', 'purchase')], 'amount');

        $user->load(['courses.lectures.lectureProgresses', 'courses.lectures.examAttempts']);

        $courses = $user->courses()
            ->with([
                'lectures' => function ($q) use ($user) {
                    $q->orderBy('order_index')
                        ->with(['lectureProgresses' => fn($pq) => $pq->where('user_id', $user->id)])
                        ->with(['examAttempts' => fn($eq) => $eq->where('user_id', $user->id)->orderBy('created_at', 'desc')]);
                },
            ])
            ->get()
            ->map(function ($course) {
                $lectures = $course->lectures->map(function ($lecture) {
                    $progress = $lecture->lectureProgresses->first();
                    $lastAttempt = $lecture->examAttempts->first();

                    return [
                        'id' => $lecture->id,
                        'title' => $lecture->title,
                        'isCompleted' => $progress?->is_completed ?? false,
                        'watchTime' => $progress?->watch_time_seconds ?? 0,
                        'lastExamScore' => $lastAttempt?->score,
                        'examPassed' => $lastAttempt?->passed ? true : false,
                        'attemptsCount' => $lecture->examAttempts->count(),
                    ];
                });

                return [
                    'courseId' => $course->id,
                    'courseTitle' => $course->title,
                    'completedLectures' => $lectures->where('isCompleted', true)->count(),
                    'totalLectures' => $lectures->count(),
                    'lectures' => $lectures,
                ];
            });

        return ApiResponse::success([
            'student' => [
                'id' => $user->id,
                'fullName' => $user->full_name,
                'email' => $user->email,
                'phone' => $user->phone,
                'parentPhone' => $user->parent_phone,
                'academicYear' => $user->academic_year,
                'walletBalance' => $user->wallet_balance,
            ],
            'courses' => $courses,
            'summary' => [
                'totalViolations' => $user->video_violations_count ?? 0,
                'totalPointsSpent' => (int) $user->wallet_transactions_sum_amount ?? 0,
            ],
        ], 'تم جلب التقرير الشامل للطالب');
    }
}