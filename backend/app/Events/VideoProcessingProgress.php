<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow; // ⚡ استخدام البث اللحظي المباشر
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VideoProcessingProgress implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $lectureId;

    public $phase;

    public $percent;

    /**
     * Create a new event instance.
     */
    public function __construct($lectureId, $phase, $percent)
    {
        $this->lectureId = $lectureId;
        $this->phase = $phase;
        $this->percent = $percent;
    }

    /**
     * تحديد القناة المشفرة التي سيتم البث عليها
     */
    public function broadcastOn(): array
    {
        // نستخدم PrivateChannel لمنع أي شخص غير مصرح له من الاستماع لبيانات السيرفر
        return [
            new PrivateChannel('lecture.'.$this->lectureId),
        ];
    }

    /**
     * تحديد اسم الحدث الذي ستستمع إليه الواجهة الأمامية
     */
    public function broadcastAs(): string
    {
        return 'progress.updated';
    }
}
