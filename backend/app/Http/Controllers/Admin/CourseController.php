<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Http\Resources\CourseResource; // 🚀 استدعاء المنسق لتنظيف البيانات
use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule; // 🚀 لضبط الصفوف الدراسية

class CourseController extends Controller
{
    public function index(Request $request)
    {
        // 🚀 حماية السيرفر بالـ Pagination وجلب عدد المحاضرات والطلاب بشكل خفيف
        $courses = Course::withCount(['lectures', 'students'])
            ->orderBy('created_at', 'desc')
            ->paginate($request->integer('limit', 20));

        $courses->getCollection()->transform(fn($course) => new CourseResource($course));

        return ApiResponse::paginated($courses, 'تم جلب الكورسات بنجاح');
    }

    public function latest()
    {
        // هذه الدالة ممتازة للوحة القيادة (Dashboard Widget)
        $courses = Course::withCount('lectures')
            ->latest()
            ->take(6)
            ->get();

        return ApiResponse::success(CourseResource::collection($courses), 'تم جلب أحدث الكورسات');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price_points' => ['required', 'integer', 'min:0'],
            'validity_date' => ['nullable', 'date', 'after:today'],
            'is_strict_order' => ['sometimes', 'boolean'],
            'status' => ['required', 'string', 'in:draft,published,archived'], // 🚀 جعلناه مطلوباً
            'academic_year' => ['nullable', 'string', Rule::in(['grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12', 'other'])],
        ]);

        $course = Course::create($validated);

        return ApiResponse::success(new CourseResource($course), 'تم إنشاء الكورس بنجاح', 201);
    }

    public function update(Request $request, Course $course)
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price_points' => ['sometimes', 'integer', 'min:0'],
            'validity_date' => ['nullable', 'date'],
            'is_strict_order' => ['sometimes', 'boolean'],
            'status' => ['required', 'string', 'in:draft,published,archived'], // 🚀 جعلناه مطلوباً
            'academic_year' => ['nullable', 'string', Rule::in(['grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12', 'other'])],
        ]);

        // 🚀 تحديث الرؤية للطالب تلقائياً
        if (isset($validated['status'])) {
            $validated['is_published'] = ($validated['status'] === 'published');
        }

        $course->update($validated);

        return ApiResponse::success(new CourseResource($course), 'تم تحديث الكورس بنجاح');
    }

    public function show(Course $course)
    {
        // Eager load لتقليل الاستعلامات
        $course->load('lectures');

        return ApiResponse::success(new CourseResource($course), 'تم جلب تفاصيل الكورس');
    }

    public function destroy(Course $course)
    {
        $course->delete();
        return ApiResponse::success(null, 'تم حذف الكورس بنجاح');
    }
}