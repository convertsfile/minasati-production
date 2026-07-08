<?php

namespace App\Services;

use App\Models\Course;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CourseProgressionService
{
    private array $userProgress = [];
    private array $userExams = [];
    private array $userHomeworks = [];
    private array $accumulatorCodes = [];

    /**
     * Preloads all required progression data into memory for O(1) evaluation.
     */
    public function preload(User $user, Course $course): void
    {
        $lectureIds = $course->lectures()->pluck('id')->toArray();

        if (empty($lectureIds)) {
            return;
        }

        // 1. Preload Lecture Progress (يحتوي الآن على unlocked_at)
        $this->userProgress = DB::table('lecture_progress')
            ->where('user_id', $user->id)
            ->whereIn('lecture_id', $lectureIds)
            ->get()
            ->keyBy('lecture_id')
            ->toArray();

        // 2. Preload Passed Exams (🚀 مع مراعاة الحذف الآمن)
        $this->userExams = DB::table('exam_attempts')
            ->where('user_id', $user->id)
            ->whereIn('lecture_id', $lectureIds)
            ->where('passed', true)
            ->whereNull('deleted_at') // 🚀
            ->pluck('lecture_id')
            ->flip()
            ->toArray();

        // 3. Preload Approved Homework (🚀 تصحيح اسم الجدول وإضافة الحذف الآمن)
        $this->userHomeworks = DB::table('homework_submissions')
            ->join('homeworks', 'homework_submissions.homework_id', '=', 'homeworks.id')
            ->where('homework_submissions.user_id', $user->id)
            ->where('homework_submissions.status', 'approved')
            ->whereIn('homeworks.lecture_id', $lectureIds)
            ->whereNull('homework_submissions.deleted_at') // 🚀
            ->whereNull('homeworks.deleted_at') // 🚀
            ->pluck('homeworks.lecture_id')
            ->flip()
            ->toArray();

        // (تم حذف كود student_lecture_unlocks لأنه تم الاستغناء عنه في قاعدة البيانات)

        // 4. Preload Accumulator Center Codes
        $codes = DB::table('center_codes')
            ->where('used_by', $user->id)
            ->where('course_id', $course->id)
            ->where('type', 'accumulator')
            ->get();

        $this->accumulatorCodes = [];
        foreach ($codes as $code) {
            $lecturesList = is_string($code->accumulator_lectures)
                ? json_decode($code->accumulator_lectures, true)
                : $code->accumulator_lectures;

            if (is_array($lecturesList)) {
                foreach ($lecturesList as $lId) {
                    $this->accumulatorCodes[$lId] = true;
                }
            }
        }
    }

    /**
     * Evaluates whether a lecture is unlocked purely in memory.
     * Big O Complexity: O(1) time and O(0) DB queries.
     */
    public function isLectureUnlocked(User $user, $lecture, $lecturesCollection): bool
    {
        // 1. Admin bypass or non-strict course
        if ($user->is_admin || !$lecture->course->is_strict_order) {
            return true;
        }

        // 2. Explicitly unlocked (🚀 من حقل unlocked_at المدمج في lecture_progress)
        $progress = $this->userProgress[$lecture->id] ?? null;
        if ($progress && $progress->unlocked_at !== null) {
            return true;
        }

        // Find current lecture's index in the ordered collection
        $currentIndex = $lecturesCollection->search(fn($l) => $l->id === $lecture->id);

        // First lecture is always unlocked
        if ($currentIndex === 0) {
            return true;
        }

        // Get previous lecture
        $previousLecture = $lecturesCollection[$currentIndex - 1];

        // 3. Check accumulator code bypass for the PREVIOUS lecture
        $hasBypass = isset($this->accumulatorCodes[$previousLecture->id]);

        if ($hasBypass) {
            $prevProgress = $this->userProgress[$previousLecture->id] ?? null;
            return $prevProgress && $prevProgress->is_completed;
        }

        // 4. Check video completion of previous
        $prevProgress = $this->userProgress[$previousLecture->id] ?? null;
        if (!$prevProgress || !$prevProgress->is_completed) {
            return false;
        }

        // 5. Check exam completion
        if ($previousLecture->exams->isNotEmpty()) {
            if (!isset($this->userExams[$previousLecture->id])) {
                return false;
            }
        }

        // 6. Check homework completion
        if ($previousLecture->homework->isNotEmpty()) {
            if (!isset($this->userHomeworks[$previousLecture->id])) {
                return false;
            }
        }

        return true;
    }
}