<?php

namespace Tests\Feature\ComprehensiveExam;

use App\Models\ComprehensiveExam;
use App\Models\Course;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * يضمن هذا الملف أن MAJOR #M1 (انحراف عقد ApiResponse في
 * أسطح الـ Comprehensive Exam) تم إصلاحه.
 *
 * العقد الموحّد: {success: bool, message: string, data?: any, code?: string, errors?: any, meta?: {...}}
 */
class ComprehensiveExamApiContractTest extends TestCase
{
    use DatabaseTruncation;

    public function test_available_exams_returns_unified_envelope()
    {
        $user = User::factory()->active()->create();
        $course = Course::create(['title' => 'Math', 'status' => 'published']);
        ComprehensiveExam::create([
            'course_id' => $course->id,
            'title' => 'Midterm',
            'start_time' => now()->subHour(),
            'end_time' => now()->addHour(),
            'duration_minutes' => 60,
            'pass_score' => 50,
            'max_attempts' => 1,
            'accessibility' => 'everyone',
            'price_points' => 0,
        ]);

        Sanctum::actingAs($user);
        $response = $this->getJson('/api/comprehensive-exams/available');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['success', 'message', 'data']);
    }

    public function test_start_exam_time_window_returns_unified_error_envelope()
    {
        $user = User::factory()->active()->create();
        $course = Course::create(['title' => 'Math']);
        // امتحان لم يبدأ بعد
        $exam = ComprehensiveExam::create([
            'course_id' => $course->id,
            'title' => 'Future Exam',
            'start_time' => now()->addDay(),
            'end_time' => now()->addDays(2),
            'duration_minutes' => 60,
            'pass_score' => 50,
            'max_attempts' => 1,
            'accessibility' => 'everyone',
            'price_points' => 50,
        ]);

        Sanctum::actingAs($user);
        $response = $this->postJson("/api/comprehensive-exams/{$exam->id}/start");

        // لم يتملك الامتحان → abort(403) يتم اعتراضه عبر الـ HttpException renderable
        // الموجود في bootstrap/app.php، ويُعاد كرسالة موحّدة.
        $response->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('code', 'ERR_FORBIDDEN')
            ->assertJsonStructure(['success', 'message', 'code']);
    }

    public function test_start_exam_already_owned_returns_unified_error_envelope()
    {
        $user = User::factory()->active()->create();
        $course = Course::create(['title' => 'Math']);
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
        // المستخدم مسجَّل في الكورس (بمعنى أنه يملك الاختبار تلقائياً)
        $user->courses()->attach($course->id, ['access_type' => 'purchase']);

        Sanctum::actingAs($user);
        $response = $this->postJson("/api/comprehensive-exams/{$exam->id}/start");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'attempt_id',
                    'exam' => ['title', 'duration_minutes', 'ends_at', 'end_time_absolute'],
                    'questions',
                ],
            ]);
    }

    public function test_admin_index_returns_unified_envelope()
    {
        $admin = User::factory()->active()->create(['role' => 'admin']);
        $course = Course::create(['title' => 'Math']);
        ComprehensiveExam::create([
            'course_id' => $course->id,
            'title' => 'Midterm',
            'start_time' => now()->subHour(),
            'end_time' => now()->addHour(),
            'duration_minutes' => 60,
            'pass_score' => 50,
            'max_attempts' => 1,
            'accessibility' => 'everyone',
            'price_points' => 0,
        ]);

        Sanctum::actingAs($admin);
        $response = $this->getJson("/api/admin/courses/{$course->id}/comprehensive-exams");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['success', 'message', 'data']);
    }
}
