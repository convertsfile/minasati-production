<?php

namespace Tests\Feature\Auth;

use App\Models\Otp;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTruncation; // 🚀 استيراد هام
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use DatabaseTruncation;

    public function test_user_registration_flow_end_to_end()
    {
        // 1. عزل الخدمات الخارجية
        Http::fake(); // إيقاف رسائل الـ SMS

        // 🚀 السلاح الجديد: عزل نظام الملفات حتى لا يحاول السيرفر رفع الصورة على السحابة (B2) أثناء الاختبار
        Storage::fake('b2');
        Storage::fake('public');
        Storage::fake('local');

        $phone = '01012345678';

        // 2. تجهيز بيانات الطالب
        $payload = [
            'full_name' => 'Ahmed Test',
            'email' => 'ahmed@example.com',
            'phone' => $phone,
            'parent_phone' => '01087654321',
            'academic_year' => '12',
            'student_number' => 'ST9999',
            'school' => 'Test School',
            'parent_job' => 'Engineer',
            'governorate' => 'Cairo',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            // محاكاة رفع صورة الهوية بأمان
            'id_image' => UploadedFile::fake()->image('id.jpg', 500, 500),
        ];

        // --- الخطوة الأولى: محاكاة إرسال طلب التسجيل ---
        $registerResponse = $this->post('/api/auth/register', $payload);

        // إذا فشل التسجيل، اطبع الخطأ
        if (! $registerResponse->isSuccessful()) {
            $registerResponse->dump();
        }
        $registerResponse->assertSuccessful();

        // --- الخطوة الثانية: التقاط الـ OTP الحقيقي من قاعدة البيانات ---
        $otpRecord = Otp::where('phone', '+2'.$phone)->first();
        $this->assertNotNull($otpRecord, 'System failed to save OTP in database');

        $tempUserId = $registerResponse->json('data.temp_user_id');

        // --- الخطوة الثالثة: محاكاة إرسال طلب تفعيل الـ OTP ---
        $verifyResponse = $this->postJson('/api/auth/verify-otp', [
            'temp_user_id' => $tempUserId,
            'otp' => $otpRecord->code, // استخدام الكود الحقيقي المولد
        ]);

        if (! $verifyResponse->isSuccessful()) {
            $verifyResponse->dump();
        }

        // التحقق من الاستجابة الناجحة وعودة التوكن
        $verifyResponse->assertSuccessful()
            ->assertJsonStructure(['data' => ['token', 'user']]);

        // --- الخطوة الرابعة: التحقق النهائي من قاعدة البيانات ---
        $this->assertDatabaseHas('users', [
            'phone' => $phone,
            'status' => 'pending', // يجب أن يكون الحساب معلقاً
        ]);

        // التحقق من مسح الكود بعد استخدامه
        $this->assertDatabaseMissing('otps', ['phone' => '+2'.$phone]);
    }

    public function test_registration_is_blocked_when_student_limit_reached()
    {
        // 1. Set current plan to startup (limit: 150 students)
        Setting::setValue('platform_plan', 'startup');

        // 2. Create 150 students
        User::factory()->count(150)->create(['role' => 'student']);

        // 3. Attempt to register student 151
        $payload = [
            'full_name' => 'Extra Ahmed',
            'email' => 'extra@example.com',
            'phone' => '01099999999',
            'parent_phone' => '01087654321',
            'academic_year' => '12',
            'student_number' => 'ST151',
            'school' => 'Test School',
            'parent_job' => 'Engineer',
            'governorate' => 'Cairo',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ];

        $response = $this->postJson('/api/auth/register', $payload);

        // 4. Verify rejection with 403
        $response->assertStatus(403)
            ->assertJsonPath('error', 'لقد تم الوصول للحد الأقصى للطلاب المسموح به في الباقة الحالية للمنصة.');
    }
}
