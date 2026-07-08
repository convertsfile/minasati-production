<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VideoViolation extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'lecture_id',
        'violation_type',
        'ip_address',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'violation_type' => 'string',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lecture(): BelongsTo
    {
        return $this->belongsTo(Lecture::class);
    }
}
