<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComprehensiveExamAnswer extends Model
{
    protected $guarded = ['id'];

    // 🚀 تحويل الإجابات المختارة من JSON في قاعدة البيانات إلى Array في لافاريل
    protected $casts = [
        'selected_options' => 'array',
        'is_correct' => 'boolean',
        'points_earned' => 'integer',
    ];

    /**
     * المحاولة المرتبطة بهذه الإجابة
     */
    public function attempt(): BelongsTo
    {
        return $this->belongsTo(ComprehensiveExamAttempt::class, 'attempt_id');
    }

    /**
     * السؤال الذي تمت الإجابة عليه
     */
    public function question(): BelongsTo
    {
        return $this->belongsTo(ComprehensiveExamQuestion::class, 'question_id');
    }
}