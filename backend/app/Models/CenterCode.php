<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CenterCode extends Model
{
    protected $fillable = [
        'course_id',
        'code',
        'used_by',
        'used_at',
        'type',
        'student_phone',
        'lecture_id',
        'accumulator_lectures',
    ];

    protected $casts = [
        'used_at' => 'datetime',
        'accumulator_lectures' => 'array',
    ];

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function lecture(): BelongsTo
    {
        return $this->belongsTo(Lecture::class);
    }

    public function usedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'used_by');
    }

    public function isUsed(): bool
    {
        return $this->used_by !== null;
    }

    public function markAsUsed(int $userId): void
    {
        $this->update([
            'used_by' => $userId,
            'used_at' => now(),
        ]);
    }
}
