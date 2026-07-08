<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AccountStatusNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $status;

    public $reason;

    public function __construct($status, $reason = null)
    {
        $this->status = $status;
        $this->reason = $reason;
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        $mail = (new MailMessage)
            ->subject('تحديث حالة حسابك في المنصة')
            ->greeting('مرحباً '.$notifiable->full_name);

        if ($this->status === 'active') {
            $mail->line('تم قبول حسابك بنجاح. يمكنك الآن الوصول إلى جميع الكورسات والمحتوى التعليمي.')
                ->action('تسجيل الدخول', url('/login'));
        } elseif ($this->status === 'rejected') {
            $mail->line('عذراً، تم رفض طلب تسجيلك في المنصة.');
            if ($this->reason) {
                $mail->line('السبب: '.$this->reason);
            }
            $mail->line('يرجى مراجعة وتحديث بياناتك.');
        }

        return $mail;
    }
}
