<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LectureProgress extends Model
{
    protected $table = 'lecture_progress';

    protected $fillable = [
        'user_id',
        'lecture_id',
        'watch_time_seconds',
        'is_completed',
        'last_position',
        'unlocked_at', // 🚀 بدلاً من is_unlocked
        'views_count', // 🚀 تمت إضافته
    ];

    protected $casts = [
        'is_completed' => 'boolean',
        'watch_time_seconds' => 'integer', // 🚀 التعديل الأهم للأداء (كان float)
        'last_position' => 'integer',
        'unlocked_at' => 'datetime', // 🚀
        'views_count' => 'integer', // 🚀
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lecture(): BelongsTo
    {
        return $this->belongsTo(Lecture::class);
    }
}