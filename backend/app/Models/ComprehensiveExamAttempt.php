<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ComprehensiveExamAttempt extends Model
{
    protected $guarded = ['id'];

    // 🚀 التحويل التلقائي للتواريخ والحقول المنطقية لسهولة برمجتها
    protected $casts = [
        'started_at' => 'datetime',
        'ends_at' => 'datetime',
        'completed_at' => 'datetime',
        'is_completed' => 'boolean',
        'is_passed' => 'boolean',
        'score' => 'integer',
    ];

    /**
     * الطالب صاحب المحاولة
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * الاختبار المرتبط بهذه المحاولة
     */
    public function exam(): BelongsTo
    {
        return $this->belongsTo(ComprehensiveExam::class, 'comprehensive_exam_id');
    }

    /**
     * إجابات الطالب داخل هذه المحاولة
     */
    public function answers(): HasMany
    {
        return $this->hasMany(ComprehensiveExamAnswer::class, 'attempt_id');
    }
}