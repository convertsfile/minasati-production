<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ComprehensiveExam extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'shuffle_questions' => 'boolean',
        'shuffle_options' => 'boolean',
        'delay_results' => 'boolean',
    ];

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function questions()
    {
        return $this->hasMany(ComprehensiveExamQuestion::class);
    }

    // علاقة سريعة لمعرفة الطلاب الذين اشتروا الامتحان كمنتج مستقل
    public function buyers()
    {
        return $this->belongsToMany(User::class, 'comprehensive_exam_purchases')->withPivot('amount_paid')->withTimestamps();
    }
}