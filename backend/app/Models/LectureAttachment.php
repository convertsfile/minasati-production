<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LectureAttachment extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'lecture_id',
        'file_name',
        'file_path',
        'file_type',
    ];

    public function lecture()
    {
        return $this->belongsTo(Lecture::class);
    }
}
