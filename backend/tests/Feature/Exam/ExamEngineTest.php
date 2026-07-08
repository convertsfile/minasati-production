<?php

namespace Tests\Feature\Exam;

use App\Models\Course;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\Lecture;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExamEngineTest extends TestCase
{
    use DatabaseTruncation;

    public function test_student_cannot_access_exam_without_course_purchase()
    {
        $user = User::factory()->active()->create();
        $course = Course::create(['title' => 'Biology']);
        $lecture = Lecture::create(['course_id' => $course->id, 'title' => 'Cell Structure', 'order_index' => 1]);

        Sanctum::actingAs($user);

        // محاولة جلب الامتحان بدون شراء الكورس
        $response = $this->getJson("/api/lectures/{$lecture->id}/exam");

        $response->assertStatus(403)
            ->assertJsonPath('code', 'ERR_NO_ACCESS');
    }

    public function test_student_cannot_access_lecture_2_without_passing_lecture_1()
    {
        $user = User::factory()->active()->create();
        $course = Course::create(['title' => 'Chemistry']);

        // منح الطالب وصول للكورس
        $user->courses()->attach($course->id, ['access_type' => 'purchase']);

        // إنشاء محاضرتين
        $lecture1 = Lecture::create(['course_id' => $course->id, 'title' => 'Lec 1', 'order_index' => 1]);
        $lecture2 = Lecture::create(['course_id' => $course->id, 'title' => 'Lec 2', 'order_index' => 2]);

        Sanctum::actingAs($user);

        // محاولة الوصول لامتحان المحاضرة الثانية قبل اجتياز الأولى
        $response = $this->getJson("/api/lectures/{$lecture2->id}/exam");

        $response->assertStatus(403)
            ->assertJsonPath('code', 'ERR_LECTURE_LOCKED');
    }

    public function test_student_can_access_lecture_2_after_passing_lecture_1()
    {
        $user = User::factory()->active()->create();
        $course = Course::create(['title' => 'History']);
        $user->courses()->attach($course->id, ['access_type' => 'purchase']);

        $lecture1 = Lecture::create(['course_id' => $course->id, 'title' => 'Lec 1', 'order_index' => 1]);
        $lecture2 = Lecture::create(['course_id' => $course->id, 'title' => 'Lec 2', 'order_index' => 2]);

        // إنشاء امتحان للمحاضرة الأولى وامتحان للمحاضرة الثانية
        $exam1 = Exam::create(['lecture_id' => $lecture1->id, 'form_index' => 1, 'pass_score' => 50]);
        $exam2 = Exam::create(['lecture_id' => $lecture2->id, 'form_index' => 1, 'pass_score' => 50]);

        // محاكاة: الطالب شاهد الفيديو بالكامل ونجح بالفعل في امتحان المحاضرة الأولى
        \App\Models\LectureProgress::create([
            'user_id' => $user->id,
            'lecture_id' => $lecture1->id,
            'watch_time_seconds' => 100,
            'is_completed' => true,
        ]);

        ExamAttempt::create([
            'user_id' => $user->id,
            'exam_id' => $exam1->id,
            'lecture_id' => $lecture1->id,
            'passed' => true,
            'score' => 80,
        ]);

        Sanctum::actingAs($user);

        // الآن يحاول الوصول للمحاضرة الثانية
        $response = $this->getJson("/api/lectures/{$lecture2->id}/exam");

        // يجب أن ينجح ويحصل على بيانات الامتحان
        $response->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    public function test_single_exam_version_retry_limits()
    {
        $user = User::factory()->active()->create();
        $course = Course::create(['title' => 'Math']);
        $user->courses()->attach($course->id, ['access_type' => 'purchase']);
        $lecture = Lecture::create(['course_id' => $course->id, 'title' => 'Lec 1', 'order_index' => 1]);
        $exam = Exam::create(['lecture_id' => $lecture->id, 'form_index' => 1, 'pass_score' => 50, 'duration_minutes' => 30]);

        Sanctum::actingAs($user);

        // Attempt 1: Failed
        ExamAttempt::create([
            'user_id' => $user->id,
            'exam_id' => $exam->id,
            'lecture_id' => $lecture->id,
            'passed' => false,
            'score' => 20,
            'completed_at' => now(),
        ]);

        // 2nd attempt should be locked out immediately since each version only allows 1 attempt
        $response = $this->getJson("/api/lectures/{$lecture->id}/exam");
        $response->assertStatus(403)
            ->assertJsonPath('code', 'ERR_EXAM_LOCKOUT');
    }

    public function test_multiple_exam_versions_progression_and_retake()
    {
        $user = User::factory()->active()->create();
        $course = Course::create(['title' => 'Physics']);
        $user->courses()->attach($course->id, ['access_type' => 'purchase']);
        $lecture = Lecture::create(['course_id' => $course->id, 'title' => 'Lec 1', 'order_index' => 1]);

        $exam1 = Exam::create(['lecture_id' => $lecture->id, 'form_index' => 1, 'pass_score' => 50, 'duration_minutes' => 30]);
        $exam2 = Exam::create(['lecture_id' => $lecture->id, 'form_index' => 2, 'pass_score' => 50, 'duration_minutes' => 30]);
        $exam3 = Exam::create(['lecture_id' => $lecture->id, 'form_index' => 3, 'pass_score' => 50, 'duration_minutes' => 30]);

        Sanctum::actingAs($user);

        // Access 1: Should give Form 1
        $response = $this->getJson("/api/lectures/{$lecture->id}/exam");
        $response->assertStatus(200)->assertJsonPath('data.exam.formIndex', 1);

        // Fail Form 1
        ExamAttempt::create([
            'user_id' => $user->id,
            'exam_id' => $exam1->id,
            'lecture_id' => $lecture->id,
            'passed' => false,
            'completed_at' => now(),
        ]);

        // Access 2: Should give Form 2
        $response = $this->getJson("/api/lectures/{$lecture->id}/exam");
        $response->assertStatus(200)->assertJsonPath('data.exam.formIndex', 2);

        // Fail Form 2
        ExamAttempt::create([
            'user_id' => $user->id,
            'exam_id' => $exam2->id,
            'lecture_id' => $lecture->id,
            'passed' => false,
            'completed_at' => now(),
        ]);

        // Access 3: Should give Form 3
        $response = $this->getJson("/api/lectures/{$lecture->id}/exam");
        $response->assertStatus(200)->assertJsonPath('data.exam.formIndex', 3);

        // Fail Form 3
        ExamAttempt::create([
            'user_id' => $user->id,
            'exam_id' => $exam3->id,
            'lecture_id' => $lecture->id,
            'passed' => false,
            'completed_at' => now(),
        ]);

        // Access 4: Since all are failed, student is locked out
        $response = $this->getJson("/api/lectures/{$lecture->id}/exam");
        $response->assertStatus(403)
            ->assertJsonPath('code', 'ERR_EXAM_LOCKOUT');
    }

    public function test_admin_can_instantly_unlock_lecture_for_student()
    {
        $admin = User::factory()->active()->create(['role' => 'admin']);
        $student = User::factory()->active()->create();
        $course = Course::create(['title' => 'Biology']);
        $student->courses()->attach($course->id, ['access_type' => 'purchase']);

        $lecture1 = Lecture::create(['course_id' => $course->id, 'title' => 'Lec 1', 'order_index' => 1]);
        $lecture2 = Lecture::create(['course_id' => $course->id, 'title' => 'Lec 2', 'order_index' => 2]);

        $exam1 = Exam::create(['lecture_id' => $lecture1->id, 'form_index' => 1, 'pass_score' => 50]);
        $exam2 = Exam::create(['lecture_id' => $lecture2->id, 'form_index' => 1, 'pass_score' => 50]);

        // Student tries to access Lec 2's exam - should fail (403 locked)
        Sanctum::actingAs($student);
        $response = $this->getJson("/api/lectures/{$lecture2->id}/exam");
        $response->assertStatus(403);

        // Admin unlocks it
        Sanctum::actingAs($admin);
        $response = $this->postJson("/api/admin/lectures/{$lecture2->id}/unlock-student/{$student->id}");
        $response->assertStatus(200);

        // Student tries to access Lec 2's exam - should now succeed (200)
        Sanctum::actingAs($student);
        $response = $this->getJson("/api/lectures/{$lecture2->id}/exam");
        $response->assertStatus(200);
    }

    public function test_admin_can_reset_attempts_for_student()
    {
        $admin = User::factory()->active()->create(['role' => 'admin']);
        $student = User::factory()->active()->create();
        $course = Course::create(['title' => 'Biology']);
        $student->courses()->attach($course->id, ['access_type' => 'purchase']);

        $lecture = Lecture::create(['course_id' => $course->id, 'title' => 'Lec 1', 'order_index' => 1]);
        $exam = Exam::create(['lecture_id' => $lecture->id, 'form_index' => 1, 'pass_score' => 50]);

        // Fail once (which locks student out)
        ExamAttempt::create([
            'user_id' => $student->id,
            'exam_id' => $exam->id,
            'lecture_id' => $lecture->id,
            'passed' => false,
            'completed_at' => now(),
        ]);

        // Student is locked out
        Sanctum::actingAs($student);
        $response = $this->getJson("/api/lectures/{$lecture->id}/exam");
        $response->assertStatus(403)->assertJsonPath('code', 'ERR_EXAM_LOCKOUT');

        // Admin resets attempts
        Sanctum::actingAs($admin);
        $response = $this->postJson("/api/admin/lectures/{$lecture->id}/reset-attempts/{$student->id}");
        $response->assertStatus(200);

        // Student can access again
        Sanctum::actingAs($student);
        $response = $this->getJson("/api/lectures/{$lecture->id}/exam");
        $response->assertStatus(200);
    }
}
