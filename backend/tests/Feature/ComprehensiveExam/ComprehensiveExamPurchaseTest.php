<?php

namespace Tests\Feature\ComprehensiveExam;

use App\Models\ComprehensiveExam;
use App\Models\ComprehensiveExamPurchase;
use App\Models\Course;
use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * يضمن هذا الملف أن CRITICAL #C1 (محاولة الكتابة على جدول `transactions`
 * غير الموجود) تم إصلاحه، وأن عقد الـ API الموحد مطبّق على مسار الشراء.
 *
 * العقد المتوقّع لمسار POST /api/comprehensive-exams/{id}/purchase:
 *   - 400 + success:false + code:ERR_EXAM_ALREADY_OWNED (إذا كان الطالب مالكاً)
 *   - 403 + success:false + code:ERR_EXAM_ENROLLED_ONLY (إذا كان enrolled_only)
 *   - 402 + success:false + code:ERR_INSUFFICIENT_BALANCE (إذا كان الرصيد أقل)
 *   - 201 + success:true + data:{comprehensive_exam_id, amount_paid, new_balance, wallet_transaction_id}
 *   - على النجاح: تُسجَّل صفقة في wallet_transactions (وليس في جدول transactions الخرافي)
 */
class ComprehensiveExamPurchaseTest extends TestCase
{
    use DatabaseTruncation;

    public function test_purchase_writes_to_wallet_transactions_not_ghost_table()
    {
        $user = User::factory()->active()->create(['wallet_balance' => 200]);
        $course = Course::create(['title' => 'Math 101', 'price_points' => 100]);
        $exam = ComprehensiveExam::create([
            'course_id' => $course->id,
            'title' => 'Midterm',
            'start_time' => now()->subHour(),
            'end_time' => now()->addHour(),
            'duration_minutes' => 60,
            'pass_score' => 50,
            'max_attempts' => 1,
            'accessibility' => 'everyone',
            'price_points' => 50,
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson("/api/comprehensive-exams/{$exam->id}/purchase");

        // ✅ لا 500 — العقد الموحّد
        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.comprehensive_exam_id', $exam->id)
            ->assertJsonPath('data.amount_paid', 50)
            ->assertJsonPath('data.new_balance', 150);

        // ✅ لا توجد كتابة على جدول `transactions` الخرافي
        $ghostTableExists = collect(DB::select("SHOW TABLES LIKE 'transactions'"))->isNotEmpty();
        $this->assertFalse($ghostTableExists, 'جدول transactions يجب ألا يكون موجوداً أصلاً (التحقق من غياب الكتابة على جدول وهمي)');

        // ✅ بديلاً عن ذلك: صفقة wallet_transactions موثّقة ومرتبطة بالـ reference
        $this->assertDatabaseHas('wallet_transactions', [
            'user_id' => $user->id,
            'type' => 'purchase',
            'amount' => 50,
            'balance_before' => 200,
            'balance_after' => 150,
            'status' => 'completed',
        ]);

        // ✅ سجل الشراء سُجِّل
        $this->assertDatabaseHas('comprehensive_exam_purchases', [
            'user_id' => $user->id,
            'comprehensive_exam_id' => $exam->id,
            'amount_paid' => 50,
        ]);

        // ✅ الرصيد الفعلي خُصم
        $this->assertSame(150, $user->fresh()->wallet_balance);
    }

    public function test_purchase_rejects_already_owned_exam()
    {
        $user = User::factory()->active()->create(['wallet_balance' => 500]);
        $course = Course::create(['title' => 'Physics']);
        $exam = ComprehensiveExam::create([
            'course_id' => $course->id,
            'title' => 'Final',
            'start_time' => now()->subHour(),
            'end_time' => now()->addHour(),
            'duration_minutes' => 60,
            'pass_score' => 50,
            'max_attempts' => 1,
            'accessibility' => 'everyone',
            'price_points' => 50,
        ]);
        ComprehensiveExamPurchase::create([
            'user_id' => $user->id,
            'comprehensive_exam_id' => $exam->id,
            'amount_paid' => 50,
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson("/api/comprehensive-exams/{$exam->id}/purchase");

        $response->assertStatus(400)
            ->assertJsonPath('success', false)
            ->assertJsonPath('code', 'ERR_EXAM_ALREADY_OWNED');

        // الرصيد لم يتغيّر
        $this->assertSame(500, $user->fresh()->wallet_balance);
        $this->assertSame(0, WalletTransaction::where('user_id', $user->id)->count());
    }

    public function test_purchase_rejects_enrolled_only_exam()
    {
        $user = User::factory()->active()->create(['wallet_balance' => 500]);
        $course = Course::create(['title' => 'Bio']);
        $exam = ComprehensiveExam::create([
            'course_id' => $course->id,
            'title' => 'Quiz',
            'start_time' => now()->subHour(),
            'end_time' => now()->addHour(),
            'duration_minutes' => 30,
            'pass_score' => 50,
            'max_attempts' => 1,
            'accessibility' => 'enrolled_only',
            'price_points' => 50,
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson("/api/comprehensive-exams/{$exam->id}/purchase");

        $response->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('code', 'ERR_EXAM_ENROLLED_ONLY');

        $this->assertSame(500, $user->fresh()->wallet_balance);
    }

    public function test_purchase_fails_with_insufficient_balance()
    {
        $user = User::factory()->active()->create(['wallet_balance' => 10]);
        $course = Course::create(['title' => 'Chem']);
        $exam = ComprehensiveExam::create([
            'course_id' => $course->id,
            'title' => 'Expensive Quiz',
            'start_time' => now()->subHour(),
            'end_time' => now()->addHour(),
            'duration_minutes' => 30,
            'pass_score' => 50,
            'max_attempts' => 1,
            'accessibility' => 'everyone',
            'price_points' => 100,
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson("/api/comprehensive-exams/{$exam->id}/purchase");

        $response->assertStatus(402)
            ->assertJsonPath('success', false)
            ->assertJsonPath('code', 'ERR_INSUFFICIENT_BALANCE');

        $this->assertSame(10, $user->fresh()->wallet_balance);
        $this->assertDatabaseMissing('comprehensive_exam_purchases', [
            'user_id' => $user->id,
        ]);
    }
}
