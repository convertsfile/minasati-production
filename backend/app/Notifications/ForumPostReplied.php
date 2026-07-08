<?php

namespace App\Notifications;

use App\Models\ForumPost;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class ForumPostReplied extends Notification implements ShouldQueue
{
    use Queueable;

    public $post;

    public function __construct(ForumPost $post)
    {
        $this->post = $post;
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'post_id' => $this->post->id,
            'message' => 'تم الرد على استفسارك في المنتدى بواسطة فريق الدعم.',
        ];
    }
}
