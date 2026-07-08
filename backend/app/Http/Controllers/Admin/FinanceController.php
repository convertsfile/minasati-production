<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Models\WalletTopupRequest;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinanceController extends Controller
{
    public function summary(Request $request)
    {
        $startDate = $request->get('start_date', now()->subDays(30)->toDateString());
        $endDate = $request->get('end_date', now()->toDateString());

        $totalTopups = WalletTopupRequest::where('status', 'approved')
            ->whereBetween('created_at', [$startDate, $endDate . ' 23:59:59'])
            ->sum('amount');

        $topupsCount = WalletTopupRequest::where('status', 'approved')
            ->whereBetween('created_at', [$startDate, $endDate . ' 23:59:59'])
            ->count();

        $courseSales = DB::table('course_student')
            ->whereBetween('created_at', [$startDate, $endDate . ' 23:59:59'])
            ->count();

        $totalStudents = User::where('role', 'student')->count();
        $activeStudents = User::where('role', 'student')->where('status', 'active')->count();

        return ApiResponse::success([
            'period' => ['start' => $startDate, 'end' => $endDate],
            'totalTopups' => (int) $totalTopups,
            'topupsCount' => $topupsCount,
            'courseSalesCount' => $courseSales,
            'students' => [
                'total' => $totalStudents,
                'active' => $activeStudents,
            ],
        ], 'تم جلب الملخص المالي بنجاح');
    }

    public function allTransactions(Request $request)
    {
        $limit = $request->integer('limit', 50);

        $transactions = WalletTransaction::with('user')
            ->orderBy('created_at', 'desc')
            ->paginate($limit);

        // 🚀 تنظيف وتنسيق البيانات مع الحفاظ على هيكل الـ Pagination الموحد
        $transactions->getCollection()->transform(fn($t) => [
            'id' => $t->id,
            'type' => $t->type,
            'amount' => $t->amount,
            'balanceBefore' => $t->balance_before,
            'balanceAfter' => $t->balance_after,
            'description' => $t->description,
            'status' => $t->status,
            'date' => $t->created_at->format('Y-m-d H:i:s'),
            'reference' => $t->reference,
            'studentName' => $t->user ? $t->user->full_name : 'غير معروف',
        ]);

        return ApiResponse::paginated($transactions, 'تم جلب جميع المعاملات');
    }

    public function studentTransactions(Request $request, User $user)
    {
        $transactions = WalletTransaction::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate($request->integer('limit', 20));

        $transactions->getCollection()->transform(fn($t) => [
            'id' => $t->id,
            'type' => $t->type,
            'amount' => $t->amount,
            'balanceBefore' => $t->balance_before,
            'balanceAfter' => $t->balance_after,
            'description' => $t->description,
            'status' => $t->status,
            'date' => $t->created_at->format('Y-m-d H:i:s'),
            'reference' => $t->reference,
        ]);

        $totalTopups = WalletTransaction::where('user_id', $user->id)->where('type', 'top_up')->where('status', 'completed')->sum('amount');
        $totalPurchases = WalletTransaction::where('user_id', $user->id)->where('type', 'purchase')->sum('amount');

        // نستخدم success لأننا نُرجع إحصائيات مختلطة مع قائمة المعاملات
        return ApiResponse::success([
            'transactions' => $transactions->items(),
            'walletBalance' => $user->wallet_balance,
            'totalTopups' => (int) $totalTopups,
            'totalPurchases' => (int) $totalPurchases,
            'pagination' => [
                'total' => $transactions->total(),
                'currentPage' => $transactions->currentPage(),
                'lastPage' => $transactions->lastPage(),
                'perPage' => $transactions->perPage(),
            ],
        ], 'تم جلب كشف حساب الطالب');
    }

    public function courseStats()
    {
        $courses = \App\Models\Course::withCount('students')->get()->map(fn($c) => [
            'id' => $c->id,
            'title' => $c->title,
            'pricePoints' => $c->price_points,
            'studentsCount' => $c->students_count,
        ]);

        return ApiResponse::success($courses, 'تم جلب إحصائيات الكورسات');
    }

    public function subscriptionLogs(Request $request)
    {
        $limit = $request->integer('limit', 50);
        $logs = DB::table('course_student')
            ->join('users', 'course_student.student_id', '=', 'users.id') // يجب التأكد أن اسم العمود student_id مطابق للـ DB
            ->join('courses', 'course_student.course_id', '=', 'courses.id')
            ->select(
                'course_student.id',
                'users.full_name as studentName',
                'courses.title as courseTitle',
                'course_student.access_type as accessType',
                'course_student.reference',
                'course_student.granted_at as grantedAt',
                'course_student.created_at as createdAt'
            )
            ->orderBy('course_student.created_at', 'desc')
            ->paginate($limit);

        // 🚀 استخدام transform على Query Builder Paginator
        $logs->getCollection()->transform(fn($log) => [
            'id' => $log->id,
            'studentName' => $log->studentName,
            'courseTitle' => $log->courseTitle,
            'accessType' => $log->accessType,
            'reference' => $log->reference,
            'grantedAt' => $log->grantedAt,
            'createdAt' => $log->createdAt,
        ]);

        return ApiResponse::paginated($logs, 'تم جلب سجل الاشتراكات');
    }

    public function courseStudents(Request $request, $courseId)
    {
        $course = \App\Models\Course::findOrFail($courseId);
        $students = $course->students()
            ->select('users.id', 'users.full_name', 'users.phone', 'users.academic_year', 'course_student.created_at as subscribed_at')
            ->get();

        return ApiResponse::success([
            'course' => [
                'id' => $course->id,
                'title' => $course->title,
            ],
            'students' => $students->map(fn($s) => [
                'id' => $s->id,
                'fullName' => $s->full_name,
                'phone' => $s->phone,
                'academicYear' => $s->academic_year,
                'subscribedAt' => $s->subscribed_at,
            ])
        ], 'تم جلب طلاب الكورس');
    }
}