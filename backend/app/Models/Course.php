<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes; // 🚀 استدعاء الـ SoftDeletes
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Course extends Model
{
    use HasFactory, SoftDeletes; // 🚀 تفعيل الحذف الآمن

    protected $fillable = [
        'title',
        'description',
        'price_points',
        'validity_date',
        'academic_year',
        'is_strict_order',
        'thumbnail', // 🚀 تمت إضافته من الـ Migrations
        'status',
    ];

    protected function casts(): array
    {
        return [
            'validity_date' => 'date',
            'is_strict_order' => 'boolean',
        ];
    }

    public function lectures(): HasMany
    {
        return $this->hasMany(Lecture::class)->orderBy('order_index');
    }

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'course_student', 'course_id', 'student_id')
            ->withPivot('access_type', 'reference', 'granted_at', 'monitoring_grace_until') // 🚀 إضافة حقول الـ Pivot الجديدة
            ->withTimestamps();
    }

    public function centerCodes(): HasMany
    {
        return $this->hasMany(CenterCode::class);
    }
}