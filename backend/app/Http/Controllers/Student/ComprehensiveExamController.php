<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\ComprehensiveExam;
use App\Models\ComprehensiveExamQuestion;
use App\Models\ComprehensiveExamPurchase;
use App\Models\ComprehensiveExamAttempt;
use App\Models\ComprehensiveExamAnswer;
// use App\Models\User;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ComprehensiveExamController extends Controller
{
    public function __construct(
        private WalletService $walletService
    ) {
    }

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

        return ApiResponse::success($mappedExams, 'تم جلب الاختبارات المتاحة بنجاح');
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
            return ApiResponse::error('أنت تمتلك هذا الاختبار بالفعل.', 'ERR_EXAM_ALREADY_OWNED', 400);
        }

        if ($exam->accessibility === 'enrolled_only') {
            return ApiResponse::error('هذا الاختبار متاح فقط للطلاب المشتركين في الكورس المرفق به.', 'ERR_EXAM_ENROLLED_ONLY', 403);
        }

        // رقم مرجعي مستقر يضمن Idempotency (نفس الطالب + نفس الاختبار ينتج نفس الـ reference)
        $reference = "EXM-{$exam->id}-U{$user->id}-" . now()->timestamp;

        // حماية مزدوجة: إذا وصل طلبان متزامنان، ثاني طلب سيُعتبر مكرراً ولن يخصم مرتين
        $existingPurchase = ComprehensiveExamPurchase::where('user_id', $user->id)
            ->where('comprehensive_exam_id', $exam->id)
            ->first();

        if ($existingPurchase) {
            return ApiResponse::success(
                ['already_owned' => true],
                'أنت تمتلك هذا الاختبار بالفعل.'
            );
        }

        // ✅ العملية بأكملها في معاملة واحدة مغلقة: خصم المحفظة + تسجيل الشراء + تسجيل الحركة المالية
        try {
            $walletTransaction = DB::transaction(function () use ($user, $exam, $reference) {
                // قفل سجل المستخدم لمنع السباق (Race Conditions)
                $lockedUser = \App\Models\User::where('id', $user->id)->lockForUpdate()->first();

                if (!$lockedUser) {
                    throw new \RuntimeException('المستخدم غير موجود.', 404);
                }

                if ($lockedUser->wallet_balance < $exam->price_points) {
                    throw new \RuntimeException('رصيد محفظتك غير كافٍ لإتمام عملية الشراء.', 402);
                }

                // ✅ خصم الرصيد + تسجيل WalletTransaction موثّق ومتسق مع باقي المنصة
                $tx = $this->walletService->deduct(
                    $lockedUser,
                    $exam->price_points,
                    "شراء اختبار شامل: {$exam->title}",
                    $reference,
                    [
                        'comprehensive_exam_id' => $exam->id,
                        'exam_title' => $exam->title,
                    ]
                );

                // ✅ تسجيل الشراء (مع توثيق الرقم المرجعي المالي لربط التدقيق)
                ComprehensiveExamPurchase::create([
                    'user_id' => $user->id,
                    'comprehensive_exam_id' => $exam->id,
                    'amount_paid' => $exam->price_points,
                ]);

                Log::info('Comprehensive exam purchased', [
                    'user_id' => $lockedUser->id,
                    'comprehensive_exam_id' => $exam->id,
                    'amount' => $exam->price_points,
                    'wallet_transaction_id' => $tx->id,
                    'reference' => $reference,
                ]);

                return $tx;
            }, 3);

            return ApiResponse::success([
                'comprehensive_exam_id' => $exam->id,
                'amount_paid' => $exam->price_points,
                'new_balance' => $user->fresh()->wallet_balance,
                'wallet_transaction_id' => $walletTransaction->id,
            ], 'تم شراء الاختبار بنجاح، يمكنك الآن البدء في حله.', 201);
        } catch (\RuntimeException $e) {
            $code = (int) $e->getCode();
            $statusCode = ($code >= 400 && $code < 500) ? $code : 500;
            $errorCode = match (true) {
                $code === 402 => 'ERR_INSUFFICIENT_BALANCE',
                $code === 404 => 'ERR_USER_NOT_FOUND',
                default => 'ERR_PURCHASE_FAILED',
            };
            return ApiResponse::error($e->getMessage(), $errorCode, $statusCode);
        } catch (\Exception $e) {
            Log::error('Comprehensive exam purchase failed', [
                'user_id' => $user->id,
                'comprehensive_exam_id' => $exam->id,
                'error' => $e->getMessage(),
            ]);
            return ApiResponse::error('حدث خطأ أثناء معالجة الدفع.', 'ERR_PURCHASE_FAILED', 500);
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
            return ApiResponse::error('لم يبدأ وقت هذا الاختبار بعد.', 'ERR_EXAM_NOT_STARTED', 403);
        }
        if ($now->isAfter($exam->end_time)) {
            return ApiResponse::error('لقد انتهى الوقت المخصص لهذا الاختبار.', 'ERR_EXAM_ENDED', 403);
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
            return ApiResponse::error('لقد استنفدت الحد الأقصى للمحاولات المسموحة.', 'ERR_EXAM_MAX_ATTEMPTS', 403);
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

        return ApiResponse::success([
            'attempt_id' => $ongoingAttempt->id,
            'exam' => [
                'title' => $exam->title,
                'duration_minutes' => $exam->duration_minutes,
                'ends_at' => $ongoingAttempt->ends_at,
                'end_time_absolute' => $exam->end_time, // للإغلاق الإجباري
            ],
            'questions' => $formattedQuestions
        ], 'تم بدء الاختبار بنجاح');
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
            return ApiResponse::error('تم تسليم هذه المحاولة مسبقاً.', 'ERR_ATTEMPT_ALREADY_SUBMITTED', 400);
        }

        $now = Carbon::now();
        $studentAnswers = $request->input('answers', []); // [ ['question_id' => 1, 'answer' => [0, 2], 'text' => null] ]

        $totalPoints = 0;
        $earnedPoints = 0;
        $hasEssay = false;

        $questions = ComprehensiveExamQuestion::where('comprehensive_exam_id', $exam->id)->get()->keyBy('id');

        try {
            $gradingResult = DB::transaction(function () use ($studentAnswers, $questions, $attempt, $now, $exam) {
            $earnedPoints = 0;
            $totalPoints = 0;
            $hasEssay = false;

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

            return [
                'score' => $scorePercentage,
                'is_passed' => $isPassed,
                'has_essay' => $hasEssay,
            ];
        }, 3);
        } catch (\Exception $e) {
            Log::error('Comprehensive exam submission failed', [
                'user_id' => $user->id,
                'comprehensive_exam_id' => $exam->id,
                'attempt_id' => $attempt->id,
                'error' => $e->getMessage(),
            ]);
            return ApiResponse::error('حدث خطأ أثناء حفظ الإجابات.', 'ERR_SUBMIT_FAILED', 500);
        }

        // الرد الذكي: إذا كان تأجيل النتيجة مفعلاً، لا ترسل الدرجة!
        if ($exam->delay_results && $now->isBefore($exam->end_time)) {
            return ApiResponse::success([
                'status' => 'delayed',
            ], 'تم تسليم الإجابات بنجاح. سيتم إعلان النتيجة بعد انتهاء وقت الاختبار بالكامل.');
        }

        if ($gradingResult['has_essay']) {
            return ApiResponse::success([
                'status' => 'needs_review',
            ], 'تم التسليم. نتيجتك معلقة بانتظار تصحيح المعلم للأسئلة المقالية.');
        }

        return ApiResponse::success([
            'score' => $gradingResult['score'],
            'is_passed' => $gradingResult['is_passed'],
            'status' => 'graded',
        ], 'تم تسليم الاختبار.');
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