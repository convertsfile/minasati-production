<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Course;
use App\Http\Resources\CourseResource; // 🚀 استدعاء المنسق السحري
use App\Services\CourseService;
use Illuminate\Http\Request;
use App\Models\Lecture;
use App\Http\Resources\LectureResource;
use Exception;


class CourseController extends Controller
{
    public function __construct(
        private CourseService $courseService
    ) {
    }

    /**
     * 1. تصفح الكورسات المتاحة (مع فلترة ذكية للسنة الدراسية)
     */
    public function index(Request $request)
    {
        // 🚀 الاعتماد على Sanctum بشكل أسهل لجلب المستخدم (إن وجد)
        $user = auth('sanctum')->user();

        $query = Course::withCount(['lectures', 'students'])
            ->where('status', 'published'); // جلب الكورسات المنشورة فقط

        // فلترة الكورسات حسب صف الطالب إذا كان مسجلاً الدخول
        if ($user && $user->academic_year) {
            $query->whereIn('academic_year', [$user->academic_year, 'other']);
        }

        $courses = Course::where('status', 'published')
            ->withCount(['lectures', 'students'])
            ->orderBy('created_at', 'desc')
            ->get();

        // 🚀 الـ CourseResource سيقوم بكل السحر (تنسيق التواريخ، الصياغة، معرفة ما إذا كان مشتراة)
        return ApiResponse::success(CourseResource::collection($courses), 'تم جلب الكورسات بنجاح');
    }

    /**
     * 2. عرض تفاصيل كورس معين ومحاضراته
     */
    public function show(Request $request, Course $course)
    {
        // إذا كان الكورس غير منشور والمستخدم ليس أدمن
        if ($course->status !== 'published') {
            return ApiResponse::error('هذا الكورس غير متاح حالياً', 'ERR_COURSE_HIDDEN', 404);
        }

        // 🚀 Eager Loading لتقليل استعلامات قاعدة البيانات (N+1 Problem)
        $course->load(['lectures.exams', 'lectures.homework']);

        // لا داعي لأي لوجيك هنا! الـ CourseResource مع LecturePolicy سيتكفلان بفتح/قفل المحاضرات تلقائياً!
        return ApiResponse::success(new CourseResource($course), 'تم جلب تفاصيل الكورس بنجاح');
    }

    /**
     * 3. جلب كورسات الطالب (My Courses)
     */
    public function myCourses(Request $request)
    {
        $user = $request->user();

        // جلب الكورسات التي يمتلكها الطالب فقط مع الـ Pivot data
        $courses = $user->courses()
            ->withCount(['lectures'])
            ->orderByPivot('created_at', 'desc')
            ->get();

        return ApiResponse::success(CourseResource::collection($courses), 'تم جلب كورساتك بنجاح');
    }

    /**
     * 4. شراء الكورس خصماً من المحفظة
     */
    public function purchase(Request $request, Course $course)
    {
        try {
            // الخدمة التي بنيناها سابقاً ستقوم بـ (التحقق من الرصيد، الخصم، تسجيل المعاملة، فتح الكورس) بداخل DB::transaction
            $this->courseService->purchaseCourse($request->user(), $course);

            $user = $request->user()->fresh();

            return ApiResponse::success([
                'courseId' => $course->id,
                'newBalance' => $user->wallet_balance,
            ], 'تم شراء الكورس بنجاح! يمكنك الآن بدء التعلم.', 201);

        } catch (Exception $e) {
            // التمييز بين الأخطاء المالية (400) وأخطاء النظام (500)
            $statusCode = $e->getCode() >= 400 && $e->getCode() < 500 ? $e->getCode() : 500;
            return ApiResponse::error($e->getMessage(), 'ERR_COURSE_PURCHASE', $statusCode);
        }
    }

    public function showLecture(Request $request, Lecture $lecture)
    {
        // 🚀 التحميل المسبق (Eager Loading) للمرفقات والواجبات لتقليل استعلامات قاعدة البيانات
        $lecture->load(['attachments', 'homework']);

        // إرسال البيانات عبر المنسق الذي سيقوم بتطبيق سياسات الأمان (LecturePolicy) وإخفاء الروابط إذا كانت مقفلة
        return ApiResponse::success(
            new LectureResource($lecture),
            'تم جلب تفاصيل المحاضرة بنجاح'
        );
    }
}