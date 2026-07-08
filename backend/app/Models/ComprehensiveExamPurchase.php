<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComprehensiveExamPurchase extends Model
{
    // حماية المعرف فقط، والسماح بالباقي
    protected $guarded = ['id'];

    /**
     * علاقة المشتري (الطالب)
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * علاقة الاختبار الذي تم شراؤه
     */
    public function exam(): BelongsTo
    {
        return $this->belongsTo(ComprehensiveExam::class, 'comprehensive_exam_id');
    }
}