<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Exam extends Model
{
    protected $fillable = [
        'lecture_id',
        'form_index',
        'duration_minutes',
        'pass_score',
        'title',
        'instructions',
        'shuffle_questions',
        'shuffle_options',
        'max_attempts',
        'show_correct_answers',
        'show_score',
        'per_question_time',
        'random_question_count',
    ];

    protected $casts = [
        'form_index' => 'integer',
        'duration_minutes' => 'integer',
        'pass_score' => 'integer',
        'shuffle_questions' => 'boolean',
        'shuffle_options' => 'boolean',
        'max_attempts' => 'integer',
        'show_correct_answers' => 'boolean',
        'show_score' => 'boolean',
        'per_question_time' => 'boolean',
        'random_question_count' => 'integer',
    ];

    public function lecture(): BelongsTo
    {
        return $this->belongsTo(Lecture::class);
    }

    public function questions(): HasMany
    {
        return $this->hasMany(Question::class)->orderBy('order_index');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(ExamAttempt::class);
    }
}
