<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\ComprehensiveExam;
use App\Models\ComprehensiveExamQuestion;
use App\Models\ComprehensiveExamPurchase;
use App\Models\ComprehensiveExamAttempt;
use App\Models\ComprehensiveExamAnswer;
// use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ComprehensiveExamController extends Controller
{
    /**
     * 1. استعراض الكتالوج (جلب الاختبارات المتاحة للطالب)
     */
    public function availableExams(Request $request)
    {
        $user = $request->user();

        // جلب معرفات الكورسات التي اشترك فيها الطالب
        $enrolledCourseIds = $user->courses()->pluck('courses.id')->toArray();

        // جلب معرفات الاختبارات التي اشتراها الطالب بشكل مستقل
        $purchasedExamIds = ComprehensiveExamPurchase::where('user_id', $user->id)->pluck('comprehensive_exam_id')->toArray();

        // استعلام لجلب الاختبارات المتاحة
        $exams = ComprehensiveExam::with('course:id,title')
            ->where(function ($query) use ($enrolledCourseIds) {
                // إما أن يكون الامتحان متاحاً للجميع
                $query->where('accessibility', 'everyone')
                    // أو متاحاً فقط للمشتركين، والطالب مشترك في هذا الكورس
                    ->orWhereIn('course_id', $enrolledCourseIds);
            })
            ->orderBy('created_at', 'desc')
            ->get();

        // تهيئة البيانات للواجهة الأمامية
        $mappedExams = $exams->map(function ($exam) use ($enrolledCourseIds, $purchasedExamIds) {
            // الطالب يمتلك الاختبار إذا كان مشتركاً بالكورس أو اشتراه مستقلاً أو كان سعره 0
            $isEnrolled = in_array($exam->course_id, $enrolledCourseIds);
            $isPurchased = in_array($exam->id, $purchasedExamIds);
            $isOwned = $isEnrolled || $isPurchased || $exam->price_points == 0;

            return [
                'id' => $exam->id,
                'title' => $exam->title,
                'course_title' => $exam->course->title ?? 'اختبار عام',
                'price_points' => $isEnrolled ? 0 : $exam->price_points, // مجاني للمشتركين
                'duration_minutes' => $exam->duration_minutes,
                'pass_score' => $exam->pass_score,
                'start_time' => $exam->start_time,
                'end_time' => $exam->end_time,
                'is_purchased' => $isOwned,
            ];
        });

        return response()->json(['data' => $mappedExams]);
    }

    /**
     * 2. عملية الشراء وخصم الرصيد من المحفظة
     */
    public function purchase(Request $request, $id)
    {
        $user = $request->user();
        $exam = ComprehensiveExam::findOrFail($id);

        // التحقق مما إذا كان الطالب يمتلكه بالفعل
        $isEnrolled = $user->courses()->where('courses.id', $exam->course_id)->exists();
        $hasPurchased = ComprehensiveExamPurchase::where('user_id', $user->id)->where('comprehensive_exam_id', $exam->id)->exists();

        if ($isEnrolled || $hasPurchased || $exam->price_points == 0) {
            return response()->json(['message' => 'أنت تمتلك هذا الاختبار بالفعل.'], 400);
        }

        if ($exam->accessibility === 'enrolled_only') {
            return response()->json(['message' => 'هذا الاختبار متاح فقط للطلاب المشتركين في الكورس المرفق به.'], 403);
        }

        // بدء عملية خصم الرصيد بأمان (Database Transaction)
        try {
            DB::beginTransaction();

            // Locking for update لمنع الشراء المزدوج (Race Conditions)
            $lockedUser = DB::table('users')->where('id', $user->id)->lockForUpdate()->first();

            if ($lockedUser->wallet_balance < $exam->price_points) {
                DB::rollBack();
                return response()->json(['message' => 'رصيد محفظتك غير كافٍ لإتمام عملية الشراء.'], 402);
            }

            // خصم الرصيد
            DB::table('users')->where('id', $user->id)->decrement('wallet_balance', $exam->price_points);

            // تسجيل عملية الشراء
            ComprehensiveExamPurchase::create([
                'user_id' => $user->id,
                'comprehensive_exam_id' => $exam->id,
                'amount_paid' => $exam->price_points,
            ]);

            // إضافة سجل مالي (Ledger) للشفافية
            DB::table('transactions')->insert([
                'user_id' => $user->id,
                'type' => 'purchase',
                'amount' => $exam->price_points,
                'description' => "شراء اختبار شامل: " . $exam->title,
                'reference' => 'EXM-' . uniqid(),
                'created_at' => now(),
            ]);

            DB::commit();

            return response()->json(['message' => 'تم شراء الاختبار بنجاح، يمكنك الآن البدء في حله.']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'حدث خطأ أثناء معالجة الدفع.'], 500);
        }
    }

    /**
     * 3. بدء الاختبار وتوليد جلسة الحل (Start Exam Session)
     */
    public function startExam(Request $request, $id)
    {
        $user = $request->user();
        $exam = ComprehensiveExam::with('questions')->findOrFail($id);

        // 1. التحقق من الملكية
        $this->verifyOwnership($user, $exam);

        // 2. التحقق من بوابات الزمن (Time Windows)
        $now = Carbon::now();
        if ($now->isBefore($exam->start_time)) {
            return response()->json(['message' => 'لم يبدأ وقت هذا الاختبار بعد.'], 403);
        }
        if ($now->isAfter($exam->end_time)) {
            return response()->json(['message' => 'لقد انتهى الوقت المخصص لهذا الاختبار.'], 403);
        }

        // 3. التحقق من عدد المحاولات (Attempts Limit)
        $attemptsCount = ComprehensiveExamAttempt::where('user_id', $user->id)
            ->where('comprehensive_exam_id', $exam->id)
            ->count();

        // هل توجد محاولة جارية لم يتم تسليمها؟
        $ongoingAttempt = ComprehensiveExamAttempt::where('user_id', $user->id)
            ->where('comprehensive_exam_id', $exam->id)
            ->where('is_completed', false)
            ->first();

        if (!$ongoingAttempt && $attemptsCount >= $exam->max_attempts) {
            return response()->json(['message' => 'لقد استنفدت الحد الأقصى للمحاولات المسموحة.'], 403);
        }

        // إنشاء محاولة جديدة إذا لم تكن هناك محاولة جارية
        if (!$ongoingAttempt) {
            $ongoingAttempt = ComprehensiveExamAttempt::create([
                'user_id' => $user->id,
                'comprehensive_exam_id' => $exam->id,
                'started_at' => $now,
                'ends_at' => $now->copy()->addMinutes($exam->duration_minutes),
                'is_completed' => false,
            ]);
        }

        // 4. تجهيز الأسئلة (خلط الأسئلة والخيارات إذا طلب الأدمن ذلك)
        $questions = $exam->questions;

        if ($exam->shuffle_questions) {
            $questions = $questions->shuffle();
        }

        $formattedQuestions = $questions->map(function ($q) use ($exam) {
            $options = $q->options;
            $optionImages = $q->option_images;

            // خلط الخيارات مع الاحتفاظ بالمفاتيح الأصلية لمعرفة الإجابة عند التصحيح
            $optionsData = [];
            if ($options && is_array($options)) {
                foreach ($options as $index => $text) {
                    $optionsData[] = [
                        'original_index' => $index,
                        'text' => $text,
                        'image' => $optionImages[$index] ?? null
                    ];
                }
                if ($exam->shuffle_options) {
                    shuffle($optionsData);
                }
            }

            return [
                'id' => $q->id,
                'type' => $q->question_type,
                'body' => $q->body,
                'image_url' => $q->image_url,
                'points' => $q->points,
                'options' => collect($optionsData)->map(function ($opt) {
                    return [
                        'id' => $opt['original_index'], // نرسل الـ ID الأصلي للواجهة لترسله عند الإجابة
                        'text' => $opt['text'],
                        'image' => $opt['image']
                    ];
                })
            ];
        });

        return response()->json([
            'attempt_id' => $ongoingAttempt->id,
            'exam' => [
                'title' => $exam->title,
                'duration_minutes' => $exam->duration_minutes,
                'ends_at' => $ongoingAttempt->ends_at,
                'end_time_absolute' => $exam->end_time, // للإغلاق الإجباري
            ],
            'questions' => $formattedQuestions
        ]);
    }

    /**
     * 4. تسليم الإجابات والتصحيح (Submit & Auto-Grade)
     */
    public function submitExam(Request $request, $id, $attemptId)
    {
        $user = $request->user();
        $exam = ComprehensiveExam::findOrFail($id);
        $attempt = ComprehensiveExamAttempt::where('id', $attemptId)->where('user_id', $user->id)->firstOrFail();

        if ($attempt->is_completed) {
            return response()->json(['message' => 'تم تسليم هذه المحاولة مسبقاً.'], 400);
        }

        $now = Carbon::now();
        $studentAnswers = $request->input('answers', []); // [ ['question_id' => 1, 'answer' => [0, 2], 'text' => null] ]

        $totalPoints = 0;
        $earnedPoints = 0;
        $hasEssay = false;

        $questions = ComprehensiveExamQuestion::where('comprehensive_exam_id', $exam->id)->get()->keyBy('id');

        DB::beginTransaction();
        try {
            foreach ($studentAnswers as $ans) {
                $question = $questions->get($ans['question_id']);
                if (!$question)
                    continue;

                $totalPoints += $question->points;
                $isCorrect = false;
                $earned = 0;

                // التصحيح التلقائي
                if ($question->question_type === 'mcq' || $question->question_type === 'multi_select') {
                    // ترتيب المصفوفات ومقارنتها
                    $correctAnswers = $question->correct_answers ?? [];
                    $studentSubmitted = $ans['answer'] ?? [];

                    sort($correctAnswers);
                    sort($studentSubmitted);

                    if ($correctAnswers === $studentSubmitted) {
                        $isCorrect = true;
                        $earned = $question->points;
                        $earnedPoints += $earned;
                    }
                } elseif ($question->question_type === 'essay') {
                    $hasEssay = true;
                    // الدرجة تحسب لاحقاً من قِبل المعلم
                }

                // حفظ إجابة الطالب للرجوع إليها
                ComprehensiveExamAnswer::create([
                    'attempt_id' => $attempt->id,
                    'question_id' => $question->id,
                    'selected_options' => $ans['answer'] ?? null,
                    'essay_text' => $ans['text'] ?? null,
                    'is_correct' => $isCorrect,
                    'points_earned' => $earned,
                ]);
            }

            // حساب النسبة المئوية
            $scorePercentage = $totalPoints > 0 ? round(($earnedPoints / $totalPoints) * 100) : 0;
            $isPassed = $scorePercentage >= $exam->pass_score;

            // تحديد حالة الامتحان (منتهي أم يحتاج مراجعة للمعلم)
            $attemptStatus = $hasEssay ? 'needs_review' : 'graded';

            // إذا سلم الطالب بعد انتهاء الوقت الإجباري (Late Submission)
            if ($now->isAfter($attempt->ends_at->addMinutes(2)) || $now->isAfter($exam->end_time)) {
                $attemptStatus = 'late_submission';
            }

            $attempt->update([
                'is_completed' => true,
                'completed_at' => $now,
                'score' => $scorePercentage,
                'is_passed' => $isPassed,
                'status' => $attemptStatus
            ]);

            DB::commit();

            // الرد الذكي: إذا كان تأجيل النتيجة مفعلاً، لا ترسل الدرجة!
            if ($exam->delay_results && $now->isBefore($exam->end_time)) {
                return response()->json([
                    'message' => 'تم تسليم الإجابات بنجاح. سيتم إعلان النتيجة بعد انتهاء وقت الاختبار بالكامل.',
                    'status' => 'delayed'
                ]);
            }

            if ($hasEssay) {
                return response()->json([
                    'message' => 'تم التسليم. نتيجتك معلقة بانتظار تصحيح المعلم للأسئلة المقالية.',
                    'status' => 'needs_review'
                ]);
            }

            return response()->json([
                'message' => 'تم تسليم الاختبار.',
                'score' => $scorePercentage,
                'is_passed' => $isPassed,
                'status' => 'graded'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'حدث خطأ أثناء حفظ الإجابات.'], 500);
        }
    }

    /**
     * Helper Method: التحقق من الملكية
     */
    private function verifyOwnership($user, $exam)
    {
        $isEnrolled = $user->courses()->where('courses.id', $exam->course_id)->exists();
        $hasPurchased = ComprehensiveExamPurchase::where('user_id', $user->id)->where('comprehensive_exam_id', $exam->id)->exists();

        if (!$isEnrolled && !$hasPurchased && $exam->price_points > 0) {
            abort(403, 'يجب عليك شراء هذا الاختبار أو الاشتراك في الكورس المرفق به أولاً.');
        }

        if ($exam->accessibility === 'enrolled_only' && !$isEnrolled) {
            abort(403, 'هذا الاختبار حصري للطلاب المشتركين في الكورس.');
        }
    }
}