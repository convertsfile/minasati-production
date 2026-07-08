<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Contract\Auth as FirebaseAuth;
use Kreait\Firebase\Exception\Auth\FailedToVerifyToken;

class OtpService
{
    protected FirebaseAuth $auth;

    // 🚀 حقن التبعية لخدمة Firebase
    public function __construct(FirebaseAuth $auth)
    {
        $this->auth = $auth;
    }

    /**
     * 🚀 هذه الدالة تستقبل الـ Token الذي يرسله الـ Frontend بعد نجاحه مع Firebase
     */
    public function verifyFirebaseToken(string $idToken, ?string $expectedPhone = null): array
    {
        // وضع التطوير (للتجاوز السريع أثناء البرمجة بدون استهلاك رسائل)
        if (config('app.debug') && $idToken === 'DEV_TEST_TOKEN_123') {
            return [
                'success' => true,
                'message' => 'تم التحقق بنجاح (وضع التطوير)',
                'phone' => $expectedPhone ?? '+201000000000'
            ];
        }

        try {
            // 1. التحقق من التوكن (التأكد أنه غير مزور وقادم فعلاً من جوجل)
            $verifiedIdToken = $this->auth->verifyIdToken($idToken);

            // 2. استخراج الـ UID الخاص بالمستخدم من التوكن
            $uid = $verifiedIdToken->claims()->get('sub');

            // 3. جلب بيانات المستخدم من Firebase لمعرفة رقم الهاتف الذي تم التحقق منه
            $user = $this->auth->getUser($uid);
            $firebasePhone = $user->phoneNumber; // سيكون بصيغة +2010xxxxxxx

            // 4. (اختياري وأمني جداً) مطابقة الرقم الذي سجله الطالب مع الرقم الذي وثقه في Firebase
            if ($expectedPhone) {
                $expectedPhone = $this->normalizePhone($expectedPhone);
                if ($firebasePhone !== $expectedPhone) {
                    Log::warning('Firebase Phone Mismatch', [
                        'expected' => $expectedPhone,
                        'firebase_returned' => $firebasePhone
                    ]);
                    return ['success' => false, 'message' => 'رقم الهاتف الموثق لا يتطابق مع الرقم المسجل', 'code' => 'ERR_PHONE_MISMATCH'];
                }
            }

            // التحقق ناجح 100%
            return [
                'success' => true,
                'message' => 'تم التحقق من الهاتف بنجاح',
                'phone' => $firebasePhone
            ];

        } catch (FailedToVerifyToken $e) {
            Log::error('Firebase token verification failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'رمز التحقق غير صالح أو منتهي الصلاحية', 'code' => 'ERR_INVALID_TOKEN'];
        } catch (Exception $e) {
            Log::error('Firebase general error: ' . $e->getMessage());
            return ['success' => false, 'message' => 'حدث خطأ غير متوقع أثناء التحقق', 'code' => 'ERR_FIREBASE_AUTH'];
        }
    }

    /**
     * توحيد صيغة رقم الهاتف للمطابقة (إضافة +2 في حال كان مصرياً)
     */
    private function normalizePhone(string $phone): string
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);

        if (str_starts_with($phone, '0')) {
            $phone = '+2' . $phone;
        } elseif (!str_starts_with($phone, '+2')) {
            $phone = '+2' . $phone;
        }

        return $phone;
    }
}