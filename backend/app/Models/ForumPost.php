<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;


class ForumPost extends Model
{
    use SoftDeletes;
    protected $fillable = ['user_id', 'body', 'image', 'admin_reply', 'admin_reply_audio', 'admin_reply_image', 'replied_at'];

    protected $casts = ['replied_at' => 'datetime'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
