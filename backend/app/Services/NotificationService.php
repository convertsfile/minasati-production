<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use App\Notifications\AccountStatusNotification;
use App\Notifications\WalletTopupApproved;
use App\Notifications\WalletTopupDeclined;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    public static function createNotification(User $user, string $type, string $title, string $message): Notification
    {
        return Notification::create([
            'user_id' => $user->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
        ]);
    }

    // 🚀 دالة مساعدة مركزية لإرسال إشعارات (الإيميل/الموبايل) بأمان دون تعطيل المنصة
    private static function sendExternalNotificationSafely(User $user, $notificationClass): void
    {
        try {
            $user->notify($notificationClass);
        } catch (\Exception $e) {
            Log::error('External Notification Failed (Mail/Push)', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
            // لا نرمي Exception لكي لا تتوقف العملية الأساسية (مثل الشراء أو الشحن)
        }
    }

    public static function notifyAccountApproved(User $user): void
    {
        self::createNotification(
            $user,
            'account_approved',
            'تم قبول حسابك',
            'تم قبول حسابك بنجاح. يمكنك الآن الوصول إلى جميع الكورسات والمحتوى التعليمي.'
        );

        Log::info('Account approved notification sent', ['user_id' => $user->id]);
    }

    public static function notifyCourseAccessGranted(User $user, string $courseTitle, string $accessType = 'purchase'): void
    {
        $message = match ($accessType) {
            'purchase' => "تم شراء الكورس \"{$courseTitle}\" بنجاح. يمكنك الآن الوصول إلى جميع محاضراته.",
            'center_code' => "تم تفعيل الكورس \"{$courseTitle}\" باستخدام كود المركز. يمكنك الآن الوصول إلى جميع محاضراته.",
            default => "تم منحك حق الوصول إلى الكورس \"{$courseTitle}\".",
        };

        self::createNotification(
            $user,
            'course_access',
            'تم تفعيل الكورس',
            $message
        );
    }

    public static function notifyExamPassed(User $user, string $lectureTitle, int $score): void
    {
        self::createNotification(
            $user,
            'exam_passed',
            'نجحت في الاختبار',
            "تهانينا! لقد نجحت في اختبار المحاضرة \"{$lectureTitle}\" بتقدير {$score}%. تم فتح المحاضرة التالية لك."
        );
    }

    public static function notifyExamFailed(User $user, string $lectureTitle, int $score, int $attemptsRemaining): void
    {
        $message = $attemptsRemaining > 0
            ? "لم تنجح في اختبار المحاضرة \"{$lectureTitle}\" (تقدير {$score}%). لديك {$attemptsRemaining} محاولات متبقية."
            : "لم تنجح في اختبار المحاضرة \"{$lectureTitle}\" (تقدير {$score}%). لقد استنفدت جميع محاولاتك. يرجى التواصل مع الدعم.";

        self::createNotification(
            $user,
            'exam_failed',
            'نتيجة الاختبار',
            $message
        );
    }

    public static function notifyWalletToppedUp(User $user, int $amount, int $newBalance): void
    {
        self::createNotification(
            $user,
            'wallet_topup',
            'تم شحن المحفظة',
            "تم شحن محفظتك بمبلغ {$amount} نقطة. رصيدك الحالي: {$newBalance} نقطة."
        );
    }

    public static function notifyAdminReply(User $user, string $postPreview): void
    {
        self::createNotification(
            $user,
            'forum_reply',
            'رد جديد على سؤالك',
            "تم الرد على سؤالك \"{$postPreview}\" من قبل المعلم."
        );
    }

    public static function notifyAccountStatus(User $user, string $status, ?string $reason = null): void
    {
        // 🚀 استخدام الإرسال الآمن
        self::sendExternalNotificationSafely($user, new AccountStatusNotification($status, $reason));

        if ($status === 'approved' || $status === 'active') {
            self::notifyAccountApproved($user);
            return;
        }

        if ($status === 'rejected') {
            $message = 'عذراً، تم رفض طلب تسجيلك في المنصة.';
            if ($reason) {
                $message .= " السبب: {$reason}. يرجى مراجعة وتحديث بياناتك.";
            }

            self::createNotification(
                $user,
                'account_rejected',
                'تحديث حالة الحساب',
                $message
            );

            Log::info('Account rejected notification sent', ['user_id' => $user->id, 'reason' => $reason]);
        }
    }

    public static function notifyWalletTopup(User $user, string $status, int $amount = 0, ?string $notes = null): void
    {
        if ($status === 'approved') {
            $message = "تمت الموافقة على طلب شحن المحفظة الخاص بك بنجاح، وتمت إضافة {$amount} ج.م إلى رصيدك.";
            if ($notes) {
                $message .= " ملاحظة: {$notes}";
            }

            $notification = self::createNotification(
                $user,
                'wallet_topup_approved',
                'تم قبول طلب الشحن 💰',
                $message
            );

            // 🚀 استخدام الإرسال الآمن
            self::sendExternalNotificationSafely($user, new WalletTopupApproved($amount, $notification->id, $notes));

        } elseif ($status === 'declined') {
            $notification = self::createNotification(
                $user,
                'wallet_topup_declined',
                'تم رفض طلب الشحن ❌',
                "عذراً، تم رفض طلب شحن المحفظة الخاص بك. السبب: {$notes}"
            );

            // 🚀 استخدام الإرسال الآمن
            self::sendExternalNotificationSafely($user, new WalletTopupDeclined($notes ?? 'غير محدد', $notification->id));
        }
    }
}