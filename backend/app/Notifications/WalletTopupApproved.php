<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class WalletTopupApproved extends Notification implements ShouldQueue
{
    use Queueable;

    public int $amount;

    public int $notificationId;

    public ?string $notes;

    public function __construct(int $amount, int $notificationId, ?string $notes = null)
    {
        $this->amount = $amount;
        $this->notificationId = $notificationId;
        $this->notes = $notes;
    }

    public function via($notifiable)
    {
        return ['mail', 'broadcast'];
    }

    public function toMail($notifiable)
    {
        $mail = (new MailMessage)
            ->subject('تم قبول طلب الشحن 💰')
            ->greeting('مرحباً '.$notifiable->full_name)
            ->line("تمت الموافقة على طلب شحن المحفظة الخاص بك بنجاح، وتمت إضافة {$this->amount} ج.م إلى رصيدك.");

        if ($this->notes) {
            $mail->line('ملاحظة الإدارة: '.$this->notes);
        }

        return $mail->action('عرض المحفظة', url('/dashboard/wallet'));
    }

    public function toBroadcast($notifiable)
    {
        $message = "تمت الموافقة على طلب شحن المحفظة الخاص بك بنجاح، وتمت إضافة {$this->amount} ج.م إلى رصيدك.";
        if ($this->notes) {
            $message .= " ملاحظة: {$this->notes}";
        }

        return new BroadcastMessage([
            'id' => $this->notificationId,
            'type' => 'wallet_topup_approved',
            'title' => 'تم قبول طلب الشحن 💰',
            'message' => $message,
            'read' => false,
            'createdAt' => now()->toISOString(),
        ]);
    }
}
