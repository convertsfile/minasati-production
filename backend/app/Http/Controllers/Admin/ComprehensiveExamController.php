<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\ComprehensiveExam;
use App\Models\ComprehensiveExamQuestion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ComprehensiveExamController extends Controller
{
    // جلب كل الاختبارات الشاملة التابعة لكورس معين
    public function index($courseId)
    {
        $exams = ComprehensiveExam::where('course_id', $courseId)
            ->withCount('questions')
            // التحقق مما إذا كان هناك أسئلة مقالية في هذا الامتحان
            ->withExists([
                'questions as has_essay_questions' => function ($query) {
                    $query->where('question_type', 'essay');
                }
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $exams]);
    }

    // إنشاء اختبار شامل جديد
    public function store(Request $request, $courseId)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'instructions' => 'nullable|string',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'duration_minutes' => 'required|integer|min:1',
            'pass_score' => 'required|integer|min:1|max:100',
            'max_attempts' => 'required|integer|min:1',
            'shuffle_questions' => 'boolean',
            'shuffle_options' => 'boolean',
            'delay_results' => 'boolean',
            // الحقول الجديدة سيتم إرسالها من الواجهة لاحقاً
            'accessibility' => 'in:enrolled_only,everyone',
            'price_points' => 'integer|min:0',
        ]);

        $validated['course_id'] = $courseId;

        $exam = ComprehensiveExam::create($validated);

        return response()->json(['data' => $exam, 'message' => 'تم الإنشاء بنجاح'], 201);
    }

    // تحديث بيانات اختبار شامل
    public function update(Request $request, $id)
    {
        $exam = ComprehensiveExam::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'instructions' => 'nullable|string',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'duration_minutes' => 'required|integer|min:1',
            'pass_score' => 'required|integer|min:1|max:100',
            'max_attempts' => 'required|integer|min:1',
            'shuffle_questions' => 'boolean',
            'shuffle_options' => 'boolean',
            'delay_results' => 'boolean',
            'accessibility' => 'in:enrolled_only,everyone',
            'price_points' => 'integer|min:0',
        ]);

        $exam->update($validated);

        return response()->json(['data' => $exam, 'message' => 'تم التحديث بنجاح']);
    }

    // مسح اختبار شامل (يدمر الأسئلة والمحاولات تلقائياً بفضل cascadeOnDelete)
    public function destroy($id)
    {
        $exam = ComprehensiveExam::findOrFail($id);
        $exam->delete();

        return response()->json(['message' => 'تم تدمير الاختبار بنجاح']);
    }

    // ==========================================
    // إدارة الأسئلة (Question Management)
    // ==========================================

    public function getQuestions($examId)
    {
        $questions = ComprehensiveExamQuestion::where('comprehensive_exam_id', $examId)
            ->orderBy('id', 'asc')
            ->get();

        return response()->json(['data' => $questions]);
    }

    public function storeQuestion(Request $request, $examId)
    {
        $validated = $request->validate([
            'question_type' => 'required|in:mcq,multi_select,essay',
            'body' => 'required|string',
            'options' => 'nullable|array',
            'correct_answers' => 'nullable|array',
            'image_url' => 'nullable|url',
            'option_images' => 'nullable|array',
            'points' => 'required|integer|min:1',
        ]);

        $validated['comprehensive_exam_id'] = $examId;

        // تنظيف الخيارات إذا كان السؤال مقالياً
        if ($validated['question_type'] === 'essay') {
            $validated['options'] = null;
            $validated['correct_answers'] = null;
            $validated['option_images'] = null;
        }

        $question = ComprehensiveExamQuestion::create($validated);

        return response()->json(['data' => $question, 'message' => 'تمت إضافة السؤال']);
    }
}