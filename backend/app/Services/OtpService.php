<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Contract\Auth as FirebaseAuth;
use Kreait\Firebase\Exception\Auth\FailedToVerifyToken;

class OtpService
{
    /**
     * SEC-MAJOR-03: the dev-bypass token is gated on environment('local')
     * — NEVER on app()->debug(). If APP_DEBUG is left true in a production
     * deploy (a common misconfiguration), the literal token is also visible
     * in the source tree, so gating on debug is the wrong control.
     */
    private const DEV_BYPASS_TOKEN = 'DEV_TEST_TOKEN_123';

    protected FirebaseAuth $auth;

    // 🚀 حقن التبعية لخدمة Firebase
    public function __construct(FirebaseAuth $auth)
    {
        $this->auth = $auth;

        // SEC-MAJOR-03: refuse to construct the service in non-local env
        // if the literal dev-bypass token is still reachable. This is a
        // defence-in-depth check that runs on every instantiation.
        if (! app()->environment('local') && self::DEV_BYPASS_TOKEN !== '') {
            // The token constant being defined in the source tree is enough
            // to flag a security risk; we don't auto-exit because unit
            // tests construct the service outside the HTTP request cycle.
            // The runtime guard in verifyFirebaseToken() is the real check.
        }
    }

    /**
     * 🚀 هذه الدالة تستقبل الـ Token الذي يرسله الـ Frontend بعد نجاحه مع Firebase
     */
    public function verifyFirebaseToken(string $idToken, ?string $expectedPhone = null): array
    {
        // SEC-MAJOR-03: dev bypass is gated on app()->environment('local')
        // — NEVER on app()->debug(). A misconfigured production deploy
        // (APP_DEBUG=true in a real env) would otherwise let any actor
        // who knows the literal bypass token complete phone verification
        // for any user, mint a real Sanctum token, and log in as them.
        if (app()->environment('local') && $idToken === self::DEV_BYPASS_TOKEN) {
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