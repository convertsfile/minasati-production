<?php

namespace Tests\Feature\Course;

use App\Models\CenterCode;
use App\Models\Course;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CenterCodeTest extends TestCase
{
    use DatabaseTruncation;

    public function test_student_can_redeem_valid_center_code()
    {
        // 1. تجهيز البيانات
        $user = User::factory()->active()->create();
        $course = Course::create(['title' => 'Physics 101', 'price_points' => 200]);
        $code = CenterCode::create(['course_id' => $course->id, 'code' => 'PHYS-2026-XYZ']);

        // 2. تسجيل الدخول
        Sanctum::actingAs($user);

        // 3. إرسال طلب تفعيل الكود
        $response = $this->postJson('/api/center-codes/redeem', [
            'code' => 'PHYS-2026-XYZ',
        ]);

        // 4. التحقق من النتيجة (يجب أن تنجح)
        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        // 5. التحقق من قاعدة البيانات (تسجيل الكود كمُستخدم، ومنح الطالب الصلاحية)
        $this->assertDatabaseHas('center_codes', [
            'id' => $code->id,
            'used_by' => $user->id,
        ]);

        $this->assertDatabaseHas('course_student', [
            'course_id' => $course->id,
            'student_id' => $user->id,
            'access_type' => 'center_code',
        ]);
    }

    public function test_student_cannot_redeem_already_used_code()
    {
        $user1 = User::factory()->active()->create();
        $user2 = User::factory()->active()->create();
        $course = Course::create(['title' => 'Math 101']);

        // كود تم استخدامه مسبقاً بواسطة user1
        $code = CenterCode::create([
            'course_id' => $course->id,
            'code' => 'MATH-USED-123',
            'used_by' => $user1->id,
            'used_at' => now(),
        ]);

        // محاولة user2 استخدام نفس الكود
        Sanctum::actingAs($user2);
        $response = $this->postJson('/api/center-codes/redeem', [
            'code' => 'MATH-USED-123',
        ]);
        // التحقق من أن النظام يرفض العملية
        $response->assertStatus(400)
            ->assertJsonPath('code', 'ERR_CODE_ALREADY_USED');

        // التحقق من أن user2 لم يحصل على الكورس
        $this->assertDatabaseMissing('course_student', [
            'course_id' => $course->id,
            'student_id' => $user2->id,
        ]);
    }

    public function test_student_can_redeem_restricted_code_with_matching_phone_number()
    {
        $user = User::factory()->active()->create(['phone' => '01067473845']);
        $course = Course::create(['title' => 'Math 101']);
        $code = CenterCode::create([
            'course_id' => $course->id,
            'code' => 'MATH-REST-123',
            'student_phone' => '01067473845',
        ]);

        Sanctum::actingAs($user);
        $response = $this->postJson('/api/center-codes/redeem', [
            'code' => 'MATH-REST-123',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('center_codes', [
            'id' => $code->id,
            'used_by' => $user->id,
        ]);
    }

    public function test_student_cannot_redeem_restricted_code_with_different_phone_number()
    {
        $user = User::factory()->active()->create(['phone' => '01222222222']);
        $course = Course::create(['title' => 'Math 101']);
        $code = CenterCode::create([
            'course_id' => $course->id,
            'code' => 'MATH-REST-456',
            'student_phone' => '01067473845',
        ]);

        Sanctum::actingAs($user);
        $response = $this->postJson('/api/center-codes/redeem', [
            'code' => 'MATH-REST-456',
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('code', 'ERR_CODE_UNAUTHORIZED');

        $this->assertDatabaseMissing('center_codes', [
            'id' => $code->id,
            'used_by' => $user->id,
        ]);
    }
}
