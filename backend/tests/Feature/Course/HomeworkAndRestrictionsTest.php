<?php

namespace Tests\Feature\Course;

use App\Models\CenterCode;
use App\Models\Course;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\Homework;
use App\Models\HomeworkSubmission;
use App\Models\Lecture;
use App\Models\LectureProgress;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HomeworkAndRestrictionsTest extends TestCase
{
    use DatabaseTruncation;

    public function test_student_cannot_progess_without_approved_homework()
    {
        $user = User::factory()->active()->create();
        $course = Course::create(['title' => 'Biology 101', 'is_strict_order' => true]);
        $user->courses()->attach($course->id, ['access_type' => 'purchase']);

        $lecture1 = Lecture::create(['course_id' => $course->id, 'title' => 'Lec 1', 'order_index' => 1]);
        $lecture2 = Lecture::create(['course_id' => $course->id, 'title' => 'Lec 2', 'order_index' => 2]);

        // Create homework for Lecture 1
        $homework = Homework::create([
            'lecture_id' => $lecture1->id,
            'title' => 'Homework 1',
            'file_path' => 'homework/sheet1.pdf',
        ]);

        // Complete video and pass exam
        LectureProgress::create([
            'user_id' => $user->id,
            'lecture_id' => $lecture1->id,
            'watch_time_seconds' => 100,
            'is_completed' => true,
        ]);

        $exam1 = Exam::create(['lecture_id' => $lecture1->id, 'form_index' => 1, 'pass_score' => 50]);
        ExamAttempt::create([
            'user_id' => $user->id,
            'exam_id' => $exam1->id,
            'lecture_id' => $lecture1->id,
            'passed' => true,
            'score' => 80,
        ]);

        // Check Lec 2 - should be locked because homework is not submitted
        $this->assertFalse($user->hasUnlockedLecture($lecture2));

        // Submit homework (pending status)
        $submission = HomeworkSubmission::create([
            'user_id' => $user->id,
            'homework_id' => $homework->id,
            'file_path' => 'submissions/student1.pdf',
            'status' => 'pending',
        ]);

        // Still locked since it's pending review
        $this->assertFalse($user->hasUnlockedLecture($lecture2));

        // Reject homework
        $submission->update(['status' => 'rejected', 'rejection_reason' => 'Bad quality']);

        // Still locked
        $this->assertFalse($user->hasUnlockedLecture($lecture2));

        // Approve homework
        $submission->update(['status' => 'approved']);

        // Now unlocked!
        $this->assertTrue($user->hasUnlockedLecture($lecture2));
    }

    public function test_strict_order_false_allows_progression_instantly()
    {
        $user = User::factory()->active()->create();
        $course = Course::create(['title' => 'Physics 101', 'is_strict_order' => false]);
        $user->courses()->attach($course->id, ['access_type' => 'purchase']);

        $lecture1 = Lecture::create(['course_id' => $course->id, 'title' => 'Lec 1', 'order_index' => 1]);
        $lecture2 = Lecture::create(['course_id' => $course->id, 'title' => 'Lec 2', 'order_index' => 2]);

        Homework::create([
            'lecture_id' => $lecture1->id,
            'title' => 'Homework 1',
            'file_path' => 'homework/sheet1.pdf',
        ]);

        // Strict order is false, so it should be unlocked instantly without any checks
        $this->assertTrue($user->hasUnlockedLecture($lecture2));
    }

    public function test_accumulator_bypass_allows_progression()
    {
        $user = User::factory()->active()->create();
        $course = Course::create(['title' => 'Chemistry 101', 'is_strict_order' => true]);
        $user->courses()->attach($course->id, ['access_type' => 'purchase']);

        $lecture1 = Lecture::create(['course_id' => $course->id, 'title' => 'Lec 1', 'order_index' => 1]);
        $lecture2 = Lecture::create(['course_id' => $course->id, 'title' => 'Lec 2', 'order_index' => 2]);

        Homework::create([
            'lecture_id' => $lecture1->id,
            'title' => 'Homework 1',
            'file_path' => 'homework/sheet1.pdf',
        ]);

        // Redeem accumulator code for lecture 1
        CenterCode::create([
            'course_id' => $course->id,
            'code' => 'ACCUM-123',
            'type' => 'accumulator',
            'accumulator_lectures' => [$lecture1->id],
            'used_by' => $user->id,
            'used_at' => now(),
        ]);

        // Video completion is still required under accumulator bypass
        $this->assertFalse($user->hasUnlockedLecture($lecture2));

        // Complete video
        LectureProgress::create([
            'user_id' => $user->id,
            'lecture_id' => $lecture1->id,
            'watch_time_seconds' => 100,
            'is_completed' => true,
        ]);

        // Unlocked! Bypassing exam and homework check
        $this->assertTrue($user->hasUnlockedLecture($lecture2));
    }

    public function test_session_code_restricts_other_lectures()
    {
        $user = User::factory()->active()->create();
        $course = Course::create(['title' => 'English 101']);
        
        $lecture1 = Lecture::create(['course_id' => $course->id, 'title' => 'Lec 1', 'order_index' => 1, 'video_status' => 'completed', 'm3u8_path' => 'hls/lec1.m3u8']);
        $lecture2 = Lecture::create(['course_id' => $course->id, 'title' => 'Lec 2', 'order_index' => 2, 'video_status' => 'completed', 'm3u8_path' => 'hls/lec2.m3u8']);

        // Student redeems a single lecture code for Lecture 1
        $user->courses()->attach($course->id, ['access_type' => 'lecture', 'granted_at' => now()]);
        \Illuminate\Support\Facades\DB::table('student_lecture_unlocks')->insert([
            'user_id' => $user->id,
            'lecture_id' => $lecture1->id,
            'created_at' => now(),
        ]);

        Sanctum::actingAs($user);

        // Get playback url for Lecture 1 - should succeed
        $response = $this->getJson("/api/video/playback/{$lecture1->id}");
        $response->assertStatus(200);

        // Get playback url for Lecture 2 - should be 403 Forbidden
        $response2 = $this->getJson("/api/video/playback/{$lecture2->id}");
        $response2->assertStatus(403);
    }

    public function test_max_video_views_limit_lockout()
    {
        $user = User::factory()->active()->create();
        $course = Course::create(['title' => 'Math 101']);
        $user->courses()->attach($course->id, ['access_type' => 'purchase']);

        $lecture = Lecture::create([
            'course_id' => $course->id, 
            'title' => 'Lec 1', 
            'order_index' => 1, 
            'max_views' => 2,
            'video_status' => 'completed',
            'm3u8_path' => 'hls/lec1.m3u8',
        ]);

        Sanctum::actingAs($user);

        // Play 1
        $this->getJson("/api/video/playback/{$lecture->id}")->assertStatus(200);

        // Play 2
        $this->getJson("/api/video/playback/{$lecture->id}")->assertStatus(200);

        // Play 3 - Exceeded! Should return 403 with VIEW_LIMIT_REACHED code
        $response = $this->getJson("/api/video/playback/{$lecture->id}");
        $response->assertStatus(403)
            ->assertJsonPath('code', 'VIEW_LIMIT_REACHED');
    }

    public function test_robust_relative_exam_timer()
    {
        $user = User::factory()->active()->create();
        $course = Course::create(['title' => 'History 101']);
        $user->courses()->attach($course->id, ['access_type' => 'purchase']);

        $lecture = Lecture::create(['course_id' => $course->id, 'title' => 'Lec 1', 'order_index' => 1]);
        $exam = Exam::create([
            'lecture_id' => $lecture->id, 
            'form_index' => 1, 
            'pass_score' => 50,
            'duration_minutes' => 30, // 1800 seconds
        ]);

        // Start exam attempt 10 minutes ago
        $attempt = ExamAttempt::create([
            'user_id' => $user->id,
            'exam_id' => $exam->id,
            'lecture_id' => $lecture->id,
            'started_at' => now()->subMinutes(10),
        ]);

        Sanctum::actingAs($user);

        // Check timer - remaining time should be around 20 minutes (1200 seconds)
        $response = $this->getJson("/api/lectures/{$lecture->id}/exam");
        $response->assertStatus(200);

        $remaining = $response->json('data.attempt.remainingTime');
        $this->assertTrue($remaining >= 1195 && $remaining <= 1205);
    }
}
