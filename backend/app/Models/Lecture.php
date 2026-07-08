<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes; // 🚀 
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Lecture extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'course_id',
        'title',
        'description',
        'order_index',
        'is_locked',
        'is_published', // 🚀
        'video_status',
        'm3u8_path',
        'raw_key',
        'encryption_key',
        'b2_video_path',
        'b2_hls_path',
        'encoding_status',
        'is_encoded',
        'video_duration',
        'size_bytes',
        'max_views',
    ];

    protected $hidden = ['m3u8_path', 'raw_key', 'encryption_key'];

    protected function casts(): array
    {
        return [
            'is_locked' => 'boolean',
            'is_published' => 'boolean', // 🚀
            'is_encoded' => 'boolean',
            'encryption_key' => 'encrypted',
            'max_views' => 'integer',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function exams(): HasMany
    {
        return $this->hasMany(Exam::class)->orderBy('form_index');
    }

    public function examAttempts(): HasMany
    {
        return $this->hasMany(ExamAttempt::class);
    }

    public function progress(): HasMany
    {
        return $this->hasMany(LectureProgress::class);
    }
    // 🚀 تم حذف الدالة المكررة lectureProgresses()

    public function attachments(): HasMany
    {
        return $this->hasMany(LectureAttachment::class);
    }

    public function homework(): HasOne
    {
        return $this->hasOne(Homework::class);
    }
}