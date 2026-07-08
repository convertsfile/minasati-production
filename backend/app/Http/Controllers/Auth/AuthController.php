<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\VerifyOtpRequest;
use App\Http\Requests\Auth\ResendOtpRequest;
use App\Http\Responses\ApiResponse;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\OtpService;
use App\Services\DeviceManagerService;
use App\Services\FileUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Exception;

class AuthController extends Controller
{
    // 🚀 حقن التبعيات (Dependency Injection) لجميع الخدمات في الـ Constructor
    public function __construct(
        protected OtpService $otpService,
        protected DeviceManagerService $deviceService,
        protected FileUploadService $fileUploadService
    ) {
    }

    /**
     * 1. تسجيل حساب طالب جديد (مرحلة المسودة - Draft)
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {

            // رفع صورة الهوية / شهادة الميلاد بأمان
            $idImageData = null;
            if ($request->hasFile('id_image')) {
                $idImageData = $this->fileUploadService->upload($request->file('id_image'), 'student_ids');
                if (!$idImageData) {
                    return ApiResponse::error('فشل في رفع صورة الهوية، يرجى إعادة المحاولة.', 'ERR_FILE_UPLOAD', 422);
                }
            }

            // توليد معرف مؤقت فريد
            $tempUserId = 'TMP-' . Str::upper(Str::random(8)) . '-' . now()->timestamp;

            // 1. إنشاء الحساب بدون حقل الـ temp_user_id (لكي لا يتدخل كاش لارافيل)
            $user = User::forceCreate([
                'full_name' => $request->full_name,
                'email' => $request->email,
                'phone' => $request->phone,
                'parent_phone' => $request->parent_phone,
                'password' => Hash::make($request->password),
                'academic_year' => $request->academic_year,
                'student_number' => $request->student_number,
                'school' => $request->school,
                'parent_job' => $request->parent_job,
                'governorate' => $request->governorate,
                'id_image' => $idImageData['public_id'] ?? null,
                'id_image_url' => $idImageData['url'] ?? null,
                'status' => 'pending',
                'is_verified' => false,
                'role' => 'student',
            ]);

            // 🚀 2. الحقن المباشر: الكتابة في الداتابيز مباشرة (تخطي جميع طبقات الكاش)
            DB::table('users')->where('id', $user->id)->update([
                'temp_user_id' => $tempUserId
            ]);

            // إرجاع المتغير المباشر للواجهة الأمامية
            return ApiResponse::success([
                'tempUserId' => $tempUserId, // نستخدم المتغير لضمان وصوله للفرونت إند
                'message' => 'تم تسجيل البيانات الأساسية بنظام الشركات بنجاح. يرجى توثيق رقم الهاتف.'
            ], 'Registration draft created', 201);
        });
    }

    /**
     * 2. التحقق من هاتف الطالب عبر Firebase ID Token
     */
    public function verifyOtp(VerifyOtpRequest $request): JsonResponse
    {
        // البحث عن المستخدم عبر المعرف المؤقت
        $user = User::where('temp_user_id', $request->temp_user_id)
            ->where('is_verified', false)
            ->first();

        if (!$user) {
            return ApiResponse::error('طلب تفعيل غير صالح أو منتهي مسبقاً.', 'ERR_USER_NOT_FOUND', 404);
        }

        // 🚀 استدعاء الـ OtpService لفك وتوثيق توكن جوجل وفحص تطابق الرقم
        $verification = $this->otpService->verifyFirebaseToken($request->firebase_token, $user->phone);

        if (!$verification['success']) {
            return ApiResponse::error($verification['message'], $verification['code'] ?? 'ERR_VERIFICATION_FAILED', 422);
        }

        // تحديث حالة التحقق برقم الهاتف بنجاح
        $user->update([
            'is_verified' => true,
            // نقوم بتصفير الـ temp_user_id لأنه أتم الغرض منه أمنياً
            'temp_user_id' => null,
        ]);

        $userAgent = $request->header('User-Agent', 'Unknown Device');
        $token = $user->createToken($userAgent)->plainTextToken;

        return ApiResponse::success([
            'user' => new UserResource($user),
            'token' => $token // 🚀 الآن نرسل التوكن للفرونت إند
        ], 'تم توثيق رقم الهاتف بنجاح بنسبة 100%. حسابك الآن قيد مراجعة الإدارة لتفعيل الصلاحيات.');
    }

    /**
     * 3. تسجيل الدخول وحماية الجلسات والأجهزة
     */
    public function login(LoginRequest $request): JsonResponse
    {
        // البحث عن المستخدم عبر البريد الإلكتروني المفهرس
        $user = User::where('email', $request->email)->first();

        // مطابقة الحساب وكلمة المرور المشفرة
        if (!$user || !Hash::check($request->password, $user->password)) {
            return ApiResponse::error('بيانات الاعتماد المدخلة غير صحيحة.', 'ERR_BAD_CREDENTIALS', 401);
        }

        // التأكد من إتمام توثيق رقم الهاتف أولاً
        if (!$user->is_verified) {
            return ApiResponse::error('يرجى تفعيل رقم الهاتف أولاً لإتمام الدخول.', 'ERR_PHONE_UNVERIFIED', 403);
        }

        // 🚀 التقاط اسم الجهاز ديناميكياً من الـ User-Agent لحماية الـ UX بدلاً من سؤال الطالب
        $userAgent = $request->header('User-Agent', 'Unknown Device');

        // 🛡️ درع الحماية ضد مشاركة الحسابات وتوزيع الأكواد عبر الـ DeviceManagerService
        $deviceCheck = $this->deviceService->handleDeviceLogin($user, $request->device_id, $userAgent);

        if ($deviceCheck['status'] !== 'allowed') {
            return ApiResponse::error(
                $deviceCheck['message'],
                $deviceCheck['status'] === 'monthly_limit_reached' ? 'ERR_DEVICE_MONTHLY_LIMIT' : 'ERR_DEVICE_LIMIT_REACHED',
                403
            );
        }

        // إصدار توكن جديد آمن عبر Laravel Sanctum
        $token = $user->createToken($userAgent)->plainTextToken;

        // إرجاع البيانات مغلفة بالـ UserResource الحارس مع التوكن
        return ApiResponse::success([
            'user' => new UserResource($user),
            'token' => $token
        ], 'تم تسجيل الدخول بنجاح بنمط الـ Enterprise.');
    }

    /**
     * 4. تسجيل الخروج وإتلاف الجلسة الحالية
     */
    public function logout(Request $request): JsonResponse
    {
        // مسح التوكن الحالي الفعال فقط من قاعدة البيانات لمنع استخدام الجلسة مجدداً
        $request->user()->currentAccessToken()->delete();

        return ApiResponse::success(null, 'تم تسجيل الخروج وإبطال صلاحية الجلسة بنجاح.');
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => new UserResource($request->user())
        ]);
    }
}