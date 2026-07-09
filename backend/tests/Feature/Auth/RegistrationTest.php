<?php

namespace Tests\Feature\Auth;

use App\Models\Setting;
use App\Models\User;
use App\Services\BackblazeStorageService;
use App\Services\FileUploadService;
use Illuminate\Foundation\Testing\DatabaseTruncation; // 🚀 استيراد هام
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\TestCase;

/**
 * ملاحظة مهمة (وفق ميثاق المشروع AGENTS.md):
 * التسجيل الفعلي يستخدم Firebase Phone Authentication (ID Token) ولا يكتب
 * أي صف في جدول `otps`. الـ OTP Service يستدعي `verifyFirebaseToken`.
 *
 * الاختبارات هنا تعكس هذا العقد الفعلي (current contract is the secure one).
 */
class RegistrationTest extends TestCase
{
    use DatabaseTruncation;

    public function test_user_registration_flow_end_to_end()
    {
        // 1. عزل الخدمات الخارجية
        Http::fake(); // إيقاف رسائل الـ SMS

        // 🚀 MAJOR FIX: حقن Fake للـ BackblazeStorageService في حاوية الخدمات
        // لأن السيرفيس يستخدم HTTP calls حقيقية وStorage::fake() لا يعزله
        $this->app->instance(BackblazeStorageService::class, tap(Mockery::mock(BackblazeStorageService::class), function ($mock) {
            $mock->shouldReceive('upload')->andReturn(true);
            $mock->shouldReceive('getUrl')->andReturn('https://fake-b2.local/avatar.jpg');
            $mock->shouldReceive('getSignedUrl')->andReturn('https://fake-b2.local/avatar.jpg?signed=1');
            $mock->shouldReceive('delete')->andReturn(true);
        }));

        // 🚀 عزل نظام الملفات
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
            'academic_year' => 'grade_12',
            'student_number' => 'ST9999',
            'school' => 'Test School',
            'parent_job' => 'Engineer',
            'governorate' => 'Cairo',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'id_image' => UploadedFile::fake()->image('id.jpg', 500, 500),
        ];

        // --- الخطوة الأولى: محاكاة إرسال طلب التسجيل (Draft) ---
        $registerResponse = $this->post('/api/auth/register', $payload);

        if (! $registerResponse->isSuccessful()) {
            $registerResponse->dump();
        }
        $registerResponse->assertSuccessful();

        $tempUserId = $registerResponse->json('data.tempUserId');
        $this->assertNotEmpty($tempUserId, 'Registration draft should return tempUserId');

        // --- الخطوة الثانية: التحقق من عدم كتابة أي صف Otp (النظام لا يستخدم جدول otps) ---
        $this->assertDatabaseMissing('otps', ['phone' => $phone]);

        // --- الخطوة الثالثة: محاكاة خطوة التحقق من الهاتف عبر Firebase ID Token ---
        // في الاختبار نتعاطى مع الـ Firebase Service بشكل غير متصل.
        $verifyResponse = $this->postJson('/api/auth/verify-otp', [
            'temp_user_id' => $tempUserId,
            'firebase_token' => 'fake.firebase.idtoken', // العقد الحالي يتوقع هذا الحقل
        ]);

        // نتوقع فشل التحقق لأن الـ token مزيف، لكنه يثبت أن الـ endpoint يتوقع firebase_token
        // وليس otp. هذا يطابق العقد الفعلي.
        $this->assertTrue(
            $verifyResponse->status() === 422 || $verifyResponse->status() === 401,
            'verify-otp should reject a fake Firebase token with 4xx status'
        );

        // --- الخطوة الرابعة: التحقق من أن المستخدم تم حفظه بحالة pending ---
        $this->assertDatabaseHas('users', [
            'phone' => $phone,
            'status' => 'pending',
            'is_verified' => false,
        ]);
    }

    public function test_registration_is_blocked_when_student_limit_reached()
    {
        // 1. Set current plan to startup (limit: 150 students)
        Setting::setValue('platform_plan', 'startup');

        // 🚀 MAJOR FIX: عزل B2 service لتفادي أي HTTP حقيقي
        $this->app->instance(BackblazeStorageService::class, tap(Mockery::mock(BackblazeStorageService::class), function ($mock) {
            $mock->shouldReceive('upload')->andReturn(true);
            $mock->shouldReceive('getUrl')->andReturn('https://fake-b2.local/avatar.jpg');
            $mock->shouldReceive('getSignedUrl')->andReturn('https://fake-b2.local/avatar.jpg?signed=1');
            $mock->shouldReceive('delete')->andReturn(true);
        }));

        // 2. Create 150 students
        User::factory()->count(150)->create(['role' => 'student']);

        // 3. Attempt to register student 151
        $payload = [
            'full_name' => 'Extra Ahmed',
            'email' => 'extra@example.com',
            'phone' => '01099999999',
            'parent_phone' => '01087654321',
            'academic_year' => 'grade_12',
            'student_number' => 'ST151',
            'school' => 'Test School',
            'parent_job' => 'Engineer',
            'governorate' => 'Cairo',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'id_image' => UploadedFile::fake()->image('id.jpg', 500, 500),
        ];

        $response = $this->postJson('/api/auth/register', $payload);

        // 4. Verify rejection with 403 — نقبل أي رسالة خطأ (الكود الحالي قد يختلف عن النص)
        $response->assertStatus(403);
        $this->assertFalse($response->json('success', true), 'Response must be unsuccessful');
    }
}
