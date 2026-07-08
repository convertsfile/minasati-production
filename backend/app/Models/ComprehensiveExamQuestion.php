<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ComprehensiveExamQuestion extends Model
{
    protected $guarded = ['id'];

    // 🚀 التحويل التلقائي لـ JSON لسهولة التعامل معه في الـ React
    protected $casts = [
        'options' => 'array',
        'correct_answers' => 'array',
        'option_images' => 'array',
    ];

    public function exam()
    {
        return $this->belongsTo(ComprehensiveExam::class, 'comprehensive_exam_id');
    }
}