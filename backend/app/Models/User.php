<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'temp_user_id',
        'full_name',
        'academic_year',
        'student_number',
        'phone',
        'parent_phone',
        'school',
        'parent_job',
        'governorate',
        'email',
        'password',
        'id_image',
        'id_image_url',
        'status',
        'wallet_balance',
        'rejection_reason',
        'role',
        'is_blocked',
        'is_verified',
        'unblock_count',
    ];

    protected $appends = ['is_admin'];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'is_blocked' => 'boolean',
            'is_verified' => 'boolean',
            'unblock_count' => 'integer',
        ];
    }

    public function getIsAdminAttribute(): bool
    {
        return $this->role === 'admin';
    }

    // --- العلاقات المدمجة ---
    public function devices(): HasMany
    {
        return $this->hasMany(UserDevice::class);
    }

    public function videoViolations(): HasMany
    {
        return $this->hasMany(VideoViolation::class);
    }

    public function walletTransactions(): HasMany
    {
        return $this->hasMany(WalletTransaction::class);
    }

    public function walletTopupRequests(): HasMany
    {
        return $this->hasMany(WalletTopupRequest::class);
    }

    public function forumPosts(): HasMany
    {
        return $this->hasMany(ForumPost::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function lectureProgresses(): HasMany
    {
        return $this->hasMany(LectureProgress::class);
    }

    public function examAttempts(): HasMany
    {
        return $this->hasMany(ExamAttempt::class);
    }

    public function courses(): BelongsToMany
    {
        return $this->belongsToMany(Course::class, 'course_student', 'student_id', 'course_id')
            ->withPivot('access_type', 'reference', 'granted_at', 'monitoring_grace_until') // 🚀 تم إضافة حقل فترة السماح
            ->withTimestamps();
    }

    public function homeworkSubmissions(): HasMany
    {
        return $this->hasMany(HomeworkSubmission::class);
    }

    public function hasUnlockedLecture(Lecture $lecture): bool
    {
        $course = $lecture->course;
        if (!$course) {
            return false;
        }

        // 🚨 الطالب يجب أن يكون مشتركاً في الكورس للوصول إلى المحاضرات المغلقة
        $isPurchased = $this->courses()->where('course_id', $course->id)->exists();
        if (!$isPurchased) {
            return false;
        }

        if (!$course->is_strict_order) {
            return true;
        }

        // 🚀 التعديل المعماري 1: الاعتماد على unlocked_at من جدول lecture_progress
        $progress = $this->lectureProgresses()->where('lecture_id', $lecture->id)->first();
        if ($progress && $progress->unlocked_at !== null) {
            return true;
        }

        // 🚀 (تم حذف استعلام DB::table('student_lecture_unlocks') لأنه لم يعد موجوداً)

        $lectures = $course->lectures()->orderBy('order_index')->get();
        $currentIndex = $lectures->search(fn($l) => $l->id === $lecture->id);

        if ($currentIndex === 0) {
            return true;
        }

        $previousLecture = $lectures[$currentIndex - 1];

        $hasBypass = \Illuminate\Support\Facades\DB::table('center_codes')
            ->where('used_by', $this->id)
            ->where('course_id', $course->id)
            ->where('type', 'accumulator')
            ->get()
            ->contains(function ($code) use ($previousLecture) {
                $lecturesList = is_string($code->accumulator_lectures)
                    ? json_decode($code->accumulator_lectures, true)
                    : $code->accumulator_lectures;
                return is_array($lecturesList) && in_array($previousLecture->id, $lecturesList);
            });

        if ($hasBypass) {
            $prevProgress = $this->lectureProgresses()->where('lecture_id', $previousLecture->id)->first();
            return $prevProgress && $prevProgress->is_completed;
        }

        $prevProgress = $this->lectureProgresses()->where('lecture_id', $previousLecture->id)->first();
        if (!$prevProgress || !$prevProgress->is_completed) {
            return false;
        }

        $hasExams = $previousLecture->exams()->exists();
        if ($hasExams) {
            $passedExam = $this->examAttempts()
                ->where('lecture_id', $previousLecture->id)
                ->where('passed', true)
                ->exists();
            if (!$passedExam) {
                return false;
            }
        }

        $hasHomework = $previousLecture->homework()->exists();
        if ($hasHomework) {
            $homeworkApproved = \App\Models\HomeworkSubmission::where('user_id', $this->id)
                ->whereHas('homework', fn($q) => $q->where('lecture_id', $previousLecture->id))
                ->where('status', 'approved')
                ->exists();
            if (!$homeworkApproved) {
                return false;
            }
        }

        return true;
    }
}
