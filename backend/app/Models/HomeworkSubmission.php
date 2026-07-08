<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class HomeworkSubmission extends Model
{
    use SoftDeletes;
    protected $table = 'homework_submissions';

    protected $fillable = [
        'user_id',
        'homework_id',
        'file_path',
        'status',
        'rejection_reason',
        'score',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function homework(): BelongsTo
    {
        return $this->belongsTo(Homework::class);
    }
}
