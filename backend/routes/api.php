<?php

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

Broadcast::routes(['middleware' => ['auth:sanctum']]);

/*
|--------------------------------------------------------------------------
| 🧩 CONTROLLER IMPORTS (ORGANIZED)
|--------------------------------------------------------------------------
*/

// 1. Auth & Security
use App\Http\Controllers\Admin\AdminSecurityController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AdminWalletController; // 🚀 RELIABILITY-MAJOR-01: liveness + readiness endpoints
use App\Http\Controllers\Admin\CenterCodeController as AdminCenterCodeController; // 🚀 RELIABILITY-MAJOR-02: Prometheus /metrics endpoint
// 2. Admin Controllers
use App\Http\Controllers\Admin\ComprehensiveExamController;
use App\Http\Controllers\Admin\CourseController as AdminCourseController;
use App\Http\Controllers\Admin\ExamController as AdminExamController;
use App\Http\Controllers\Admin\FinanceController;
use App\Http\Controllers\Admin\ForumController as AdminForumController;
use App\Http\Controllers\Admin\HomeworkController as AdminHomeworkController;
use App\Http\Controllers\Admin\LectureController as AdminLectureController;
use App\Http\Controllers\Admin\PaymentNumberController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Admin\StudentMonitoringController;
use App\Http\Controllers\Admin\StudentProgressController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\MetricsController;
use App\Http\Controllers\Payment\FawryController;
// 3. Student Controllers
use App\Http\Controllers\Payment\VodafoneCashController;
use App\Http\Controllers\Student\CenterCodeController as StudentCenterCodeController;
use App\Http\Controllers\Student\ComprehensiveExamController as StudentComprehensiveExamController;
use App\Http\Controllers\Student\CourseController as StudentCourseController;
use App\Http\Controllers\Student\ExamController as StudentExamController;
use App\Http\Controllers\Student\ForumController as StudentForumController;
use App\Http\Controllers\Student\HomeworkController as StudentHomeworkController;
use App\Http\Controllers\Student\LectureProgressController;
// 4. Video & Wallet
use App\Http\Controllers\Student\NotificationController;
use App\Http\Controllers\Student\VideoViolationController;
use App\Http\Controllers\Video\VideoEngineController;
use App\Http\Controllers\Wallet\WalletController;
use App\Http\Controllers\Wallet\WalletTopupController;

/*
|--------------------------------------------------------------------------
| 🔓 PUBLIC ROUTES (No Authentication Required)
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login_secure');
    Route::post('/verify-otp', [AuthController::class, 'verifyOtp'])->middleware('throttle:5,1');
    Route::post('/resend-otp', [AuthController::class, 'resendOtp'])->middleware('throttle:3,1');
});

// 🌍 Public Course Routes
Route::prefix('courses')->group(function () {
    Route::get('/', [StudentCourseController::class, 'index']);
    Route::get('/{course}', [StudentCourseController::class, 'show'])->where('course', '[0-9]+');
});

// 🚀 RELIABILITY-MAJOR-01: split liveness vs. readiness.
// /up remains a shallow liveness check (back-compat). /health/live
// and /health/ready give orchestrators the standard k8s split —
// readiness pings MySQL/cache/queue/B2 and returns 503 if any
// required dependency is down, so traffic is drained from a
// degraded instance instead of piling on 3-second DB hangs.
Route::prefix('health')->group(function () {
    Route::get('/live', [HealthController::class, 'live']);
    Route::get('/ready', [HealthController::class, 'ready']);
});

// 🚀 RELIABILITY-MAJOR-02: Prometheus metrics endpoint.
// Exposes counters/gauges/histograms in text exposition format.
// Prometheus scrapers do not carry auth headers, so the route is
// locked down in two layers:
//   1. `restrict_to_internal_ips` middleware — enforces a CIDR
//      allowlist (METRICS_ALLOWED_IPS, default loopback + RFC1918).
//      Non-allowlisted callers get 404 so the endpoint's existence
//      is not leaked to a port-scan.
//   2. `throttle:60,1` — caps scrape rate at 60/min to prevent
//      burst DoS amplification.
Route::get('/metrics', MetricsController::class)
    ->middleware(['restrict_to_internal_ips', 'throttle:60,1']);

/*
|--------------------------------------------------------------------------
| 🛡️ STUDENT ROUTES (Requires Sanctum + Active User Shield)
|--------------------------------------------------------------------------
*/
// 🚀 تم إضافة 'active_user' لطرد أي طالب يتم حظره من الإدارة في نفس اللحظة!
Route::middleware(['auth:sanctum'])->get('/auth/me', [AuthController::class, 'me']);
Route::middleware(['auth:sanctum', 'active_user'])->group(function () {

    // Auth Profile
    Route::get('/auth/status', [AuthController::class, 'status']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/resubmit-documents', [AuthController::class, 'resubmit']);

    // Wallet & Top-ups
    Route::prefix('wallet')->group(function () {
        Route::get('/balance', [WalletController::class, 'balance']);
        Route::get('/transactions', [WalletController::class, 'transactions']);
        Route::get('/topup/history', [WalletTopupController::class, 'history']);
        Route::post('/topup/initiate', [WalletTopupController::class, 'initiate'])->middleware('throttle:financial_ops');
        Route::post('/topup/submit', [WalletTopupController::class, 'submit'])->middleware('throttle:financial_ops');
    });

    // Center Codes
    // 🚀 حماية التخمين العنيف (Brute-Force): 10 محاولات فقط كل دقيقة
    Route::post('/center-codes/redeem', [StudentCenterCodeController::class, 'redeem'])->middleware('throttle:10,1');

    // Courses & Lectures
    Route::prefix('courses')->group(function () {
        Route::get('/my-courses', [StudentCourseController::class, 'myCourses']);
        Route::get('/lectures', [StudentCourseController::class, 'getCourseLectures']);
        Route::post('/{course}/purchase', [StudentCourseController::class, 'purchase'])->middleware('throttle:financial_ops');
    });

    Route::get('/lectures/{lecture}', [StudentCourseController::class, 'showLecture']);

    // ==========================================
    // 🎬 مسارات مشغل الفيديو
    // ==========================================
    Route::get('/video/playback/{lecture}', [VideoEngineController::class, 'getPlaybackUrl']);
    Route::get('/video/secure-playlist/{lecture}', [VideoEngineController::class, 'getSecurePlaylist']);
    Route::get('/video/key/{lecture}', [VideoEngineController::class, 'getEncryptionKey']);

    // ==========================================
    // 📈 مسارات تقدم الطالب والمخالفات
    // ==========================================
    Route::prefix('lectures/{lecture}')->group(function () {
        Route::get('/progress', [LectureProgressController::class, 'getProgress']);
        Route::post('/progress', [LectureProgressController::class, 'updateProgress']);
        Route::post('/violation', [VideoViolationController::class, 'log']);
    });

    Route::get('/violations/count', [VideoViolationController::class, 'count']);

    // Exams
    Route::get('/exams/my-results', [StudentExamController::class, 'myAttempts']);
    Route::get('/exams/attempts/{attempt}', [StudentExamController::class, 'getAttemptDetails']);
    Route::get('/lectures/{lecture}/exam', [StudentExamController::class, 'getExam']);
    Route::post('/lectures/{lecture}/exam/{exam}/submit', [StudentExamController::class, 'submitExam']);

    // مسارات الطالب للاختبارات الشاملة (Student Routes)
    Route::get('/comprehensive-exams/available', [StudentComprehensiveExamController::class, 'availableExams']);
    Route::get('/comprehensive-exams/{id}', [StudentComprehensiveExamController::class, 'show']); // لجلب تفاصيل امتحان واحد
    Route::post('/comprehensive-exams/{id}/purchase', [StudentComprehensiveExamController::class, 'purchase']);
    Route::post('/comprehensive-exams/{id}/start', [StudentComprehensiveExamController::class, 'startExam']);
    Route::post('/comprehensive-exams/{id}/attempts/{attemptId}/submit', [StudentComprehensiveExamController::class, 'submitExam']);

    // Homework
    Route::post('/lectures/{lecture}/homework/submit', [StudentHomeworkController::class, 'submit'])->middleware('throttle:10,1');
    Route::get('/lectures/{lecture}/homework/status', [StudentHomeworkController::class, 'status']);

    // Forum & Community
    Route::prefix('forum')->group(function () {
        Route::get('/', [StudentForumController::class, 'index']);
        // 🚀 حماية ضد الإغراق (Spam)
        Route::post('/', [StudentForumController::class, 'store'])->middleware('throttle:5,1');
        Route::delete('/{post}', [StudentForumController::class, 'destroy']);
    });

    // Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::post('/{notification}/read', [NotificationController::class, 'markAsRead']);
        Route::post('/mark-all-read', [NotificationController::class, 'markAllAsRead']);
    });

    Route::get('/settings', [SettingsController::class, 'get']);
});

/*
|--------------------------------------------------------------------------
| 👑 ADMIN ROUTES (Requires Sanctum + AdminMiddleware)
|--------------------------------------------------------------------------
*/
Route::prefix('admin')->middleware(['auth:sanctum', 'admin'])->group(function () {

    // User Management
    Route::prefix('users')->group(function () {
        Route::get('/', [AdminUserController::class, 'allUsers']);
        Route::get('/pending', [AdminUserController::class, 'pendingUsers']);
        Route::post('/{id}/approve', [AdminUserController::class, 'approveUser']);
        Route::post('/{id}/reject', [AdminUserController::class, 'rejectUser']);
        Route::post('/{user}/wallet', [AdminUserController::class, 'updateWallet']);
        Route::post('/{user}/courses/{course}/toggle', [AdminUserController::class, 'toggleCourse']);
        Route::post('/{user}/reset-password', [AdminUserController::class, 'resetPassword']);
    });

    // Security & Violations
    Route::prefix('security')->group(function () {
        Route::get('/violations', [AdminSecurityController::class, 'violations']);
        Route::get('/students-with-violations', [AdminSecurityController::class, 'studentsWithViolations']);
        Route::post('/block-student/{user}', [AdminSecurityController::class, 'blockStudent']);
        Route::post('/unblock-student/{user}', [AdminSecurityController::class, 'unblockStudent']);
        Route::delete('/violations/{id}', [AdminSecurityController::class, 'deleteViolation']);
        Route::delete('/students/{id}/violations', [AdminSecurityController::class, 'clearStudentViolations']);
    });

    // Analytics & Student Progress
    Route::get('/student-progress', [StudentProgressController::class, 'index']);
    Route::get('/student-progress/{user}', [StudentProgressController::class, 'show']);

    // Student Monitoring Dashboard
    Route::prefix('monitoring')->group(function () {
        Route::get('/students', [StudentMonitoringController::class, 'index']);
        Route::post('/extend-grace', [StudentMonitoringController::class, 'extendGrace']);
        Route::get('/attempts/{attempt}', [StudentMonitoringController::class, 'reviewAttempt']);
    });

    // Finance & Wallet Management
    Route::prefix('wallet')->group(function () {
        Route::get('/summary', [FinanceController::class, 'summary']);
        Route::get('/transactions', [FinanceController::class, 'allTransactions']);
        Route::get('/student/{user}/transactions', [FinanceController::class, 'studentTransactions']);
        Route::get('/course-stats', [FinanceController::class, 'courseStats']);
        Route::get('/courses/{courseId}/students', [FinanceController::class, 'courseStudents']);
        Route::get('/subscriptions', [FinanceController::class, 'subscriptionLogs']);

        Route::get('/stats', [AdminWalletController::class, 'stats']);
        Route::get('/topups', [AdminWalletController::class, 'pendingTopups']);
        Route::get('/topups/{id}', [AdminWalletController::class, 'topupDetail']);
        Route::post('/topups/{id}/approve', [AdminWalletController::class, 'approve']);
        Route::post('/topups/{id}/adjust', [AdminWalletController::class, 'adjustAndApprove']);
        Route::post('/topups/{id}/decline', [AdminWalletController::class, 'decline']);
    });

    // Payment Numbers Settings
    Route::prefix('payment-numbers')->group(function () {
        Route::get('/', [PaymentNumberController::class, 'index']);
        Route::post('/', [PaymentNumberController::class, 'store']);
        Route::patch('/{paymentNumber}', [PaymentNumberController::class, 'update']);
        Route::delete('/{paymentNumber}', [PaymentNumberController::class, 'destroy']);
    });

    // Center Codes Generation
    Route::prefix('center-codes')->group(function () {
        Route::get('/', [AdminCenterCodeController::class, 'index']);
        Route::post('/generate', [AdminCenterCodeController::class, 'generate']);
        Route::get('/export', [AdminCenterCodeController::class, 'export']);
    });

    // Courses & Lectures Management
    Route::apiResource('courses', AdminCourseController::class);

    Route::prefix('courses/{course}')->group(function () {
        Route::get('/lectures', [AdminLectureController::class, 'index']);
        Route::post('/lectures', [AdminLectureController::class, 'store']);
        Route::post('/lectures/reorder', [AdminLectureController::class, 'reorder']);
    });

    Route::apiResource('lectures', AdminLectureController::class)->except(['index', 'store']);

    // Video Engine Admin Ticketing & Deletion
    Route::prefix('lectures/{lecture}')->group(function () {
        Route::get('/upload-ticket', [VideoEngineController::class, 'getUploadToken']);
        Route::post('/start-processing', [VideoEngineController::class, 'startProcessing']);
        Route::post('/cancel-upload', [AdminLectureController::class, 'cancelUpload']);
        Route::delete('/video', [AdminLectureController::class, 'destroyVideo']);

        // Attachments
        Route::post('/attachments', [AdminLectureController::class, 'uploadAttachment']);
        Route::delete('/attachments/{attachment}', [AdminLectureController::class, 'deleteAttachment']);

        // Exam Management per Lecture
        Route::get('/exams', [AdminExamController::class, 'index']);
        Route::post('/exams', [AdminExamController::class, 'store']);
        Route::get('/exams/results', [AdminExamController::class, 'studentResults']);
        Route::post('/unlock-student/{user}', [AdminExamController::class, 'unlockLecture']);
        Route::post('/reset-attempts/{user}', [AdminExamController::class, 'resetAttempts']);
    });

    // Exams & Questions Management
    Route::apiResource('exams', AdminExamController::class)->except(['index', 'store']);
    Route::post('/exams/{exam}/questions', [AdminExamController::class, 'addQuestion']);
    Route::post('/questions/upload-image', [AdminExamController::class, 'uploadQuestionImage']);
    Route::put('/questions/{question}', [AdminExamController::class, 'updateQuestion']);
    Route::delete('/questions/{question}', [AdminExamController::class, 'deleteQuestion']);
    Route::post('/exams/{exam}/questions/reorder', [AdminExamController::class, 'reorderQuestions']);

    // مسارات إدارة الاختبارات الشاملة (للكورس)
    Route::get('/courses/{course}/comprehensive-exams', [ComprehensiveExamController::class, 'index']);
    Route::post('/courses/{course}/comprehensive-exams', [ComprehensiveExamController::class, 'store']);
    Route::put('/comprehensive-exams/{id}', [ComprehensiveExamController::class, 'update']);
    Route::delete('/comprehensive-exams/{id}', [ComprehensiveExamController::class, 'destroy']);

    // مسارات إدارة أسئلة الاختبار الشامل
    Route::get('/comprehensive-exams/{exam}/questions', [ComprehensiveExamController::class, 'getQuestions']);
    Route::post('/comprehensive-exams/{exam}/questions', [ComprehensiveExamController::class, 'storeQuestion']);
    // مسار الحذف (يمكن استخدام نفس مسار حذف الأسئلة العادي الذي أعددناه مسبقاً إذا كان متوافقاً، أو إنشاء مسار جديد)
    Route::delete('/questions/{id}', [ComprehensiveExamController::class, 'destroyQuestion']);

    // Admin Homework Management
    Route::post('/lectures/{lecture}/homework', [AdminHomeworkController::class, 'storeOrUpdate']);
    Route::get('/homework/submissions', [AdminHomeworkController::class, 'pendingSubmissions']);
    Route::post('/homework/submissions/{submission}/review', [AdminHomeworkController::class, 'review']);

    // Admin Forum Management
    Route::prefix('forum')->group(function () {
        Route::get('/', [AdminForumController::class, 'index']);
        Route::post('/{post}/reply', [AdminForumController::class, 'reply']);
        Route::put('/{post}/reply', [AdminForumController::class, 'updateReply']);
        Route::delete('/{post}/reply', [AdminForumController::class, 'deleteReply']);
        Route::delete('/{post}', [AdminForumController::class, 'destroy']);
    });

    // Settings
    Route::prefix('settings')->group(function () {
        Route::get('/', [SettingsController::class, 'get']);
        Route::put('/', [SettingsController::class, 'update']);
    });
    Route::get('/limits', [SettingsController::class, 'limits']);
});

/*
|--------------------------------------------------------------------------
| 🔌 EXTERNAL WEBHOOKS (Payment Gateways - No Auth)
|--------------------------------------------------------------------------
*/
Route::prefix('webhooks')->group(function () {
    Route::post('/fawry', [FawryController::class, 'webhook']);
    Route::post('/vodafone-cash', [VodafoneCashController::class, 'webhook']);
});

/*
|--------------------------------------------------------------------------
| 🤖 INTERNAL MICROSERVICES WEBHOOKS (Protected by JWT/Signatures)
|--------------------------------------------------------------------------
*/
Route::prefix('internal/webhooks')->group(function () {
    Route::post('/video-encoded', [VideoEngineController::class, 'handleWebhook']);
    Route::post('/lectures/{lecture}/progress', [VideoEngineController::class, 'updateProgress']);
});
