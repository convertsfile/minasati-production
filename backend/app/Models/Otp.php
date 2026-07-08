<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Otp extends Model
{
    protected $fillable = [
        'phone',
        'code',
        'expires_at',
        'attempts',
        'is_used', // 🚀 حماية من الـ Replay Attack
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'attempts' => 'integer',
        'is_used' => 'boolean', // 🚀
    ];
}