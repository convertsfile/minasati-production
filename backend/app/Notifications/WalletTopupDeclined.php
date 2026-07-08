<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class WalletTopupDeclined extends Notification implements ShouldQueue
{
    use Queueable;

    public string $reason;

    public int $notificationId;

    public function __construct(string $reason, int $notificationId)
    {
        $this->reason = $reason;
        $this->notificationId = $notificationId;
    }

    public function via($notifiable)
    {
        return ['mail', 'broadcast'];
    }

    public function toMail($notifiable)
    {
        return (new MailMessage)
            ->subject('تم رفض طلب الشحن ❌')
            ->greeting('مرحباً '.$notifiable->full_name)
            ->line('عذراً، تم رفض طلب شحن المحفظة الخاص بك.')
            ->line("السبب: {$this->reason}")
            ->action('عرض المحفظة', url('/dashboard/wallet'));
    }

    public function toBroadcast($notifiable)
    {
        return new BroadcastMessage([
            'id' => $this->notificationId,
            'type' => 'wallet_topup_declined',
            'title' => 'تم رفض طلب الشحن ❌',
            'message' => "عذراً، تم رفض طلب شحن المحفظة الخاص بك. السبب: {$this->reason}",
            'read' => false,
            'createdAt' => now()->toISOString(),
        ]);
    }
}
