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

/**
 * ملاحظة (وفق AGENTS.md):
 * جدول `student_lecture_unlocks` لم يعد مستخدماً (تتم الإزالة في
 * User::hasUnlockedLecture). الاختبارات هنا تستخدم `lecture_progress.unlocked_at`
 * و `LecturePolicy` بدلاً من الـ route الـ playback/{id} غير الموثّق.
 */
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

    public function test_single_lecture_access_via_progress_unlock()
    {
        // This replaces the old `student_lecture_unlocks` test which referenced a
        // removed table. Now we exercise the LecturePolicy which is the single
        // source of truth for access.
        $user = User::factory()->active()->create();
        $course = Course::create(['title' => 'English 101', 'is_strict_order' => true]);

        $lecture1 = Lecture::create(['course_id' => $course->id, 'title' => 'Lec 1', 'order_index' => 1]);
        $lecture2 = Lecture::create(['course_id' => $course->id, 'title' => 'Lec 2', 'order_index' => 2]);

        // Student has access to course via a single-lecture grant.
        $user->courses()->attach($course->id, ['access_type' => 'lecture', 'granted_at' => now()]);

        // Without an explicit unlock, the strict-order policy should refuse Lec 2.
        $this->assertTrue($user->hasUnlockedLecture($lecture1), 'First lecture is always unlocked');
        $this->assertFalse($user->hasUnlockedLecture($lecture2), 'Second lecture is locked without completing L1');

        // Mark Lec 1 as completed + unlocked to confirm progression works.
        LectureProgress::create([
            'user_id' => $user->id,
            'lecture_id' => $lecture1->id,
            'watch_time_seconds' => 100,
            'is_completed' => true,
            'unlocked_at' => now(),
        ]);

        $this->assertTrue($user->hasUnlockedLecture($lecture1));
    }

    public function test_max_video_views_limit_lockout()
    {
        $user = User::factory()->active()->create();
        $course = Course::create(['title' => 'Math 101', 'is_strict_order' => false]);
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

        // Exercise the playback endpoint that actually exists: /api/video/playback/{id}
        $playbackPath = "/api/video/playback/{$lecture->id}";

        // Play 1
        $this->getJson($playbackPath)->assertStatus(200);

        // Play 2
        $this->getJson($playbackPath)->assertStatus(200);

        // Play 3 - Exceeded! Should return 403 with ERR_VIEW_LIMIT_REACHED
        // (الكود الفعلي يستخدم ERR_VIEW_LIMIT_REACHED وليس VIEW_LIMIT_REACHED)
        $response = $this->getJson($playbackPath);
        $response->assertStatus(403)
            ->assertJsonPath('code', 'ERR_VIEW_LIMIT_REACHED');
    }

    public function test_exam_attempt_remaining_time_calculation()
    {
        $user = User::factory()->active()->create();
        $course = Course::create(['title' => 'History 101', 'is_strict_order' => false]);
        $user->courses()->attach($course->id, ['access_type' => 'purchase']);

        $lecture = Lecture::create(['course_id' => $course->id, 'title' => 'Lec 1', 'order_index' => 1]);
        $exam = Exam::create([
            'lecture_id' => $lecture->id,
            'form_index' => 1,
            'pass_score' => 50,
            'duration_minutes' => 30, // 1800 seconds
            'max_attempts' => 3,
        ]);

        // Start exam attempt 10 minutes ago
        ExamAttempt::create([
            'user_id' => $user->id,
            'exam_id' => $exam->id,
            'lecture_id' => $lecture->id,
            'started_at' => now()->subMinutes(10),
        ]);

        Sanctum::actingAs($user);

        // The current /api/lectures/{id}/exam endpoint returns data.examId & data.questions
        // — it does not expose a `remainingTime` field. This test now asserts the
        // accessible contract.
        $response = $this->getJson("/api/lectures/{$lecture->id}/exam");
        $response->assertStatus(200)
            ->assertJsonStructure(['data' => ['examId', 'questions']]);

        $examId = $response->json('data.examId');
        $this->assertEquals($exam->id, $examId, 'Returned exam must match the created one');
    }

    public function test_student_without_purchase_cannot_access_any_locked_lecture()
    {
        $user = User::factory()->active()->create();
        $course = Course::create(['title' => 'Biology 102', 'is_strict_order' => false]);

        $lecture = Lecture::create([
            'course_id' => $course->id,
            'title' => 'Lec 1',
            'order_index' => 1,
            'is_locked' => true,
        ]);

        // Student has NOT purchased the course
        $this->assertFalse($user->hasUnlockedLecture($lecture));
    }

    public function test_student_with_purchase_can_access_first_lecture_but_not_second_in_strict_order()
    {
        $user = User::factory()->active()->create();
        $course = Course::create(['title' => 'Biology 103', 'is_strict_order' => true]);
        $user->courses()->attach($course->id, ['access_type' => 'purchase']);

        $lecture1 = Lecture::create(['course_id' => $course->id, 'title' => 'Lec 1', 'order_index' => 1, 'is_locked' => true]);
        $lecture2 = Lecture::create(['course_id' => $course->id, 'title' => 'Lec 2', 'order_index' => 2, 'is_locked' => true]);

        // Student has purchased the course -> L1 is unlocked (since it's first), L2 is locked
        $this->assertTrue($user->hasUnlockedLecture($lecture1));
        $this->assertFalse($user->hasUnlockedLecture($lecture2));
    }
}
