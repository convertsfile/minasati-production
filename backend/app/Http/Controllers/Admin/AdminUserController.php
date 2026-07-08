<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Http\Resources\UserResource; // 🚀 استدعاء المنسق الموحد
use App\Models\User;
use App\Services\NotificationService;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password; // 🚀 لتوحيد معايير الباسورد
use Illuminate\Support\Facades\Log;

class AdminUserController extends Controller
{
    public function pendingUsers(Request $request)
    {
        // 🚀 استخدام الباجينيشن + ربطه بـ UserResource
        $users = User::where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->paginate($request->integer('limit', 20));

        $users->getCollection()->transform(fn($user) => new UserResource($user));

        return ApiResponse::paginated($users, 'تم جلب طلبات الانضمام المعلقة.');
    }

    public function approveUser(int $id)
    {
        $user = User::find($id);

        if (!$user)
            return ApiResponse::error('الطالب غير موجود', 'USER_NOT_FOUND', 404);
        if ($user->status !== 'pending')
            return ApiResponse::error('الطالب ليس في حالة معلقة', 'INVALID_STATUS', 400);

        $user->update(['status' => 'active', 'rejection_reason' => null]);

        NotificationService::notifyAccountStatus($user, 'active');
        Log::info('User approved by admin', ['user_id' => $id, 'admin_id' => Auth::id()]);

        return ApiResponse::success(new UserResource($user), 'تم قبول الطالب بنجاح.');
    }

    public function rejectUser(Request $request, int $id)
    {
        $validated = $request->validate(['reason' => 'required|string|min:10|max:500']);
        $user = User::find($id);

        if (!$user)
            return ApiResponse::error('الطالب غير موجود', 'USER_NOT_FOUND', 404);
        if ($user->status !== 'pending')
            return ApiResponse::error('الطالب ليس في حالة معلقة', 'INVALID_STATUS', 400);

        $user->update([
            'status' => 'rejected',
            'rejection_reason' => $validated['reason'],
        ]);

        NotificationService::notifyAccountStatus($user, 'rejected', $validated['reason']);

        return ApiResponse::success(new UserResource($user), 'تم رفض الطالب وإرسال إشعار له.');
    }

    public function allUsers(Request $request)
    {
        $query = User::query();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($academicYear = $request->query('academic_year')) {
            $query->where('academic_year', $academicYear);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('student_number', 'like', "%{$search}%"); // 🚀 مفيد للبحث بكود الطالب
            });
        }

        $users = $query->orderBy('created_at', 'desc')->paginate($request->integer('limit', 20));
        $users->getCollection()->transform(fn($user) => new UserResource($user));

        return ApiResponse::paginated($users, 'تم جلب قائمة الطلاب.');
    }

    public function updateWallet(Request $request, User $user, WalletService $walletService)
    {
        if ($user->status === 'pending') {
            return ApiResponse::error('الطالب معلق، لا يمكن تعديل رصيده.', 'ERR_STUDENT_PENDING', 400);
        }

        $validated = $request->validate([
            'balance' => 'required|integer|min:0',
        ]);

        // 🚀 الحماية المالية المفرطة: Database Transaction & Row Locking لمنع التداخل
        DB::transaction(function () use ($user, $validated, $walletService) {
            // قفل صف الطالب
            $lockedUser = User::where('id', $user->id)->lockForUpdate()->first();

            $newBalance = $validated['balance'];
            $oldBalance = $lockedUser->wallet_balance;

            if ($newBalance > $oldBalance) {
                $walletService->refund($lockedUser, $newBalance - $oldBalance, 'تعديل رصيد إداري (إضافة)', "ADMIN_ADJ_" . time());
            } elseif ($newBalance < $oldBalance) {
                $walletService->deduct($lockedUser, $oldBalance - $newBalance, 'تعديل رصيد إداري (خصم)', "ADMIN_ADJ_" . time());
            }
        }, 3);

        return ApiResponse::success(['walletBalance' => $user->fresh()->wallet_balance], 'تم تعديل الرصيد بنجاح.');
    }

    public function toggleCourse(User $user, \App\Models\Course $course)
    {
        if ($user->status === 'pending') {
            return ApiResponse::error('الطالب معلق، لا يمكن تفعيل الاشتراك.', 'ERR_STUDENT_PENDING', 400);
        }

        $exists = $user->courses()->where('course_id', $course->id)->exists();

        if ($exists) {
            $user->courses()->detach($course->id);
            $enrolled = false;
            $message = 'تم إلغاء اشتراك الطالب من الكورس.';
        } else {
            // 🚀 توثيق العملية برقم مرجعي إداري
            $user->courses()->attach($course->id, [
                'access_type' => 'admin_override',
                'reference' => 'ADMIN_FORCE_GRANT_' . auth()->id(),
                'granted_at' => now(),
            ]);
            $enrolled = true;
            $message = 'تم تفعيل الكورس للطالب بنجاح.';
        }

        return ApiResponse::success(['enrolled' => $enrolled], $message);
    }

    public function resetPassword(Request $request, User $user)
    {
        // 🚀 توحيد معايير الأمان لكلمات المرور
        $validated = $request->validate([
            'password' => ['required', 'string', Password::min(8)->letters()->numbers()],
        ]);

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        // يجب إخراج الطالب من كافة أجهزته إذا تم تغيير الباسورد أمنياً
        $user->tokens()->delete();

        return ApiResponse::success(null, 'تم إعادة تعيين كلمة المرور وطرد الطالب من جلساته النشطة.');
    }
}