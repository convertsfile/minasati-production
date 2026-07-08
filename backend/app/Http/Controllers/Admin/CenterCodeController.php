<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse; // 🚀 الاعتماد على الميثاق الموحد
use App\Models\CenterCode;
use App\Models\Course;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CenterCodeController extends Controller
{
    public function generate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'course_id' => 'required|exists:courses,id',
            'quantity' => 'required|integer|min:1|max:1000',
            'type' => 'nullable|string|in:course,lecture,accumulator',
            'lecture_id' => 'required_if:type,lecture|nullable|integer|exists:lectures,id',
            'accumulator_lectures' => 'required_if:type,accumulator|nullable|array',
            'accumulator_lectures.*' => 'integer|exists:lectures,id',
            'student_phone' => 'nullable|string|max:20',
        ]);

        $course = Course::findOrFail($validated['course_id']);
        $codes = [];

        try {
            DB::transaction(function () use ($validated, $course, &$codes) {
                for ($i = 0; $i < $validated['quantity']; $i++) {
                    $code = $this->generateUniqueCode();

                    $centerCode = CenterCode::create([
                        'course_id' => $course->id,
                        'code' => $code,
                        'type' => $validated['type'] ?? 'course',
                        'student_phone' => $validated['student_phone'] ?? null,
                        'lecture_id' => $validated['lecture_id'] ?? null,
                        'accumulator_lectures' => $validated['accumulator_lectures'] ?? null,
                    ]);

                    $codes[] = [
                        'id' => $centerCode->id,
                        'code' => $code,
                        'type' => $centerCode->type,
                    ];
                }
            }, 3);

            return ApiResponse::success([
                'codes' => $codes,
                'count' => count($codes),
            ], 'تم توليد الأكواد بنجاح.');

        } catch (\Exception $e) {
            return ApiResponse::error('فشل في توليد الأكواد. يرجى المحاولة مرة أخرى.', 'CODE_GENERATION_FAILED', 500);
        }
    }

    public function index(Request $request): JsonResponse
    {
        $courseId = $request->query('course_id');
        $status = $request->query('status'); // 'used' or 'unused'
        $limit = $request->integer('limit', 50);

        $query = CenterCode::with(['course:id,title', 'lecture:id,title', 'usedBy:id,full_name,phone']);

        if ($courseId) {
            $query->where('course_id', $courseId);
        }

        if ($status === 'used') {
            $query->whereNotNull('used_by');
        } elseif ($status === 'unused') {
            $query->whereNull('used_by');
        }

        $codes = $query->orderBy('created_at', 'desc')->paginate($limit);

        $codes->getCollection()->transform(fn($code) => [
            'id' => $code->id,
            'code' => $code->code,
            'courseId' => $code->course_id,
            'courseTitle' => $code->course->title,
            'type' => $code->type,
            'studentPhone' => $code->student_phone,
            'lectureId' => $code->lecture_id,
            'lectureTitle' => $code->lecture?->title,
            'accumulatorLectures' => $code->accumulator_lectures,
            'isUsed' => $code->isUsed(),
            'usedBy' => $code->usedBy ? [
                'id' => $code->usedBy->id,
                'fullName' => $code->usedBy->full_name,
                'phone' => $code->usedBy->phone,
            ] : null,
            'usedAt' => $code->used_at?->format('Y-m-d H:i:s'),
            'createdAt' => $code->created_at->format('Y-m-d H:i:s'),
        ]);

        return ApiResponse::paginated($codes, 'تم جلب قائمة الأكواد بنجاح.');
    }

    public function export(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'course_id' => 'required|exists:courses,id',
        ]);

        $codes = CenterCode::where('course_id', $validated['course_id'])
            ->with('course:id,title')
            ->whereNull('used_by')
            ->get();

        $csvData = $codes->map(fn($code) => [
            'code' => $code->code,
            'course' => $code->course->title,
            'created_at' => $code->created_at->format('Y-m-d H:i:s'),
        ]);

        return ApiResponse::success($csvData, 'تم تصدير الأكواد المتاحة.');
    }

    /**
     * 🚀 السلاح السري للـ UX: توليد كود لا يحتوي على حروف قابلة للالتباس!
     * تم حذف حروف (O, I, L) وأرقام (0, 1) لمنع خطأ الطالب أثناء القراءة من الكارت المطبوع.
     */
    private function generateUniqueCode(): string
    {
        $pool = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

        do {
            // توليد بصيغة: XXXX-XXXX-XXXX
            $part1 = substr(str_shuffle($pool), 0, 4);
            $part2 = substr(str_shuffle($pool), 0, 4);
            $part3 = substr(str_shuffle($pool), 0, 4);

            $code = "{$part1}-{$part2}-{$part3}";
        } while (CenterCode::where('code', $code)->exists());

        return $code;
    }
}