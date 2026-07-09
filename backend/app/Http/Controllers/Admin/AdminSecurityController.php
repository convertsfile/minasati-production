<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Models\VideoViolation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AdminSecurityController extends Controller
{
    private const FATAL_VIOLATIONS = ['devtools', 'screen_recording'];

    public function violations(Request $request)
    {
        // جلب المخالفات للطلاب الذين لديهم 3+ مخالفات مميتة
        $userIdsWith3PlusStrikes = VideoViolation::select('user_id')
            ->whereIn('violation_type', self::FATAL_VIOLATIONS)
            ->groupBy('user_id')
            ->havingRaw('COUNT(*) >= 3')
            ->pluck('user_id');

        $query = VideoViolation::with(['user', 'lecture.course'])
            ->whereIn('user_id', $userIdsWith3PlusStrikes);

        $filter = $request->get('filter', 'all');

        match ($filter) {
            'today' => $query->whereDate('created_at', today()),
            'week' => $query->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]),
            default => null,
        };

        // 🚀 استخدام الـ Pagination الصحيح لعدم خنق السيرفر
        $violations = $query->latest()->paginate(50);

        $violations->getCollection()->transform(fn($v) => [
            'id' => $v->id,
            'userId' => $v->user_id,
            'fullName' => $v->user->full_name ?? 'Unknown',
            'phone' => $v->user->phone ?? '',
            'parentPhone' => $v->user->parent_phone ?? '',
            'academicYear' => $v->user->academic_year ?? '',
            'violationType' => $v->violation_type,
            'lectureTitle' => $v->lecture->title ?? '',
            'courseTitle' => $v->course->title ?? '',
            'ipAddress' => $v->ip_address,
            'createdAt' => $v->created_at->format('Y-m-d H:i:s'),
        ]);

        return ApiResponse::paginated($violations, 'تم جلب سجل المخالفات');
    }

    public function studentsWithViolations(Request $request)
    {
        $students = User::whereHas('videoViolations')
            ->withCount([
                'videoViolations as fatal_strikes' => function ($q) {
                    $q->whereIn('violation_type', self::FATAL_VIOLATIONS);
                }
            ])
            ->orderByDesc('fatal_strikes')
            ->paginate(50); // 🚀 ضروري للأنظمة الكبيرة

        // 🚀 إصلاح N+1: جلب آخر مخالفة مميتة لكل طالب في استعلام واحد مجمَّع
        $userIds = $students->getCollection()->pluck('id');
        $lastFatalViolations = VideoViolation::whereIn('user_id', $userIds)
            ->whereIn('violation_type', self::FATAL_VIOLATIONS)
            ->whereIn('id', function ($sub) {
                $sub->selectRaw('MAX(id)')
                    ->from('video_violations')
                    ->whereIn('violation_type', self::FATAL_VIOLATIONS)
                    ->groupBy('user_id');
            })
            ->pluck('created_at', 'user_id');

        $students->getCollection()->transform(fn($user) => [
            'id' => $user->id,
            'fullName' => $user->full_name,
            'phone' => $user->phone,
            'violationsCount' => $user->fatal_strikes,
            'isBlocked' => (bool) $user->is_blocked,
            'unblockCount' => $user->unblock_count ?? 0,
            'lastViolation' => isset($lastFatalViolations[$user->id])
                ? $lastFatalViolations[$user->id]->format('Y-m-d H:i:s')
                : null,
        ]);

        return ApiResponse::paginated($students, 'تم جلب الطلاب المخالفين');
    }

    public function blockStudent(User $user)
    {
        $user->update([
            'status' => 'blocked',
            'is_blocked' => true,
            'rejection_reason' => 'حظر إداري يدوي بسبب تجاوزات أمنية.',
        ]);

        // 🚀 الطرد الفوري! تدمير جميع الجلسات النشطة ليتم قطع البث فوراً
        $user->tokens()->delete();

        Log::info('Student blocked by admin', ['user_id' => $user->id, 'admin_id' => auth()->id()]);

        return ApiResponse::success(null, 'تم حظر الطالب وقطع اتصاله بالمنصة بنجاح.');
    }

    public function unblockStudent(User $user)
    {
        $user->update([
            'status' => 'active',
            'is_blocked' => false,
            'unblock_count' => $user->unblock_count + 1,
            'rejection_reason' => null, // 🚀 تنظيف سبب الرفض
        ]);

        Log::info('Student unblocked by admin', ['user_id' => $user->id, 'admin_id' => auth()->id()]);

        return ApiResponse::success(null, 'تم فك الحظر عن الطالب بنجاح.');
    }

    public function deleteViolation($id)
    {
        VideoViolation::findOrFail($id)->delete();
        return ApiResponse::success(null, 'تم حذف المخالفة بنجاح.');
    }

    public function clearStudentViolations($userId)
    {
        VideoViolation::where('user_id', $userId)->delete();
        return ApiResponse::success(null, 'تم مسح سجل مخالفات الطالب بالكامل.');
    }
}