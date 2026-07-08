<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserDevice extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'device_id',
        'device_name',
        'last_active_at',
    ];

    // إيقاف التحديث التلقائي لـ updated_at إذا أردت، ولكن يفضل تركه
    // public $timestamps = true;

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
