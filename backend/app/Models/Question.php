<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Question extends Model
{
    protected $fillable = [
        'exam_id',
        'body',
        'options',
        'correct_answer',
        'order_index',
        'question_type',
        'image_url',
        'option_images',
        'correct_answers',
        'points',
        'time_limit_seconds',
    ];

    protected $casts = [
        'options' => 'array',
        'correct_answer' => 'integer',
        'order_index' => 'integer',
        'option_images' => 'array',
        'correct_answers' => 'array',
        'points' => 'integer',
        'time_limit_seconds' => 'integer',
    ];

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }
}
