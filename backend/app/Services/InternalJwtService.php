<?php

namespace App\Services;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Support\Carbon;
use UnexpectedValueException;

/**
 * InternalJwtService
 *
 * توليد والتحقق من JWT قصير العمر (HS256) الذي يُستخدم لتوقيع
 * الـ Webhooks بين Laravel ومحرك الـ Go. يحل هذا محل مقارنة
 * الـ Shared Secret القديمة التي كانت مكشوفة في الـ Header.
 *
 * الـ Claims:
 *   - iss: "laravel"
 *   - aud: "vod-engine"
 *   - sub: lecture_id
 *   - iat: وقت الإصدار
 *   - exp: iat + $ttl (افتراضياً 60 ثانية)
 *   - kid: معرّفة المفتاح (افتراضياً "v1")
 *   - event: اسم الحدث (مثلاً "video.encoded" أو "video.process")
 */
class InternalJwtService
{
    public const ALG = 'HS256';
    public const KID = 'v1';
    public const ISSUER = 'laravel';
    public const AUDIENCE = 'vod-engine';
    public const DEFAULT_TTL_SECONDS = 60;

    /**
     * إصدار JWT جديد.
     */
    public static function issue(string $subject, string $event = 'internal', int $ttl = self::DEFAULT_TTL_SECONDS, array $extra = []): string
    {
        $now = Carbon::now()->timestamp;

        $payload = array_merge($extra, [
            'iss' => self::ISSUER,
            'aud' => self::AUDIENCE,
            'sub' => $subject,
            'iat' => $now,
            'exp' => $now + $ttl,
            'kid' => self::KID,
            'event' => $event,
        ]);

        $secret = self::secret();

        return JWT::encode($payload, $secret, self::ALG, self::KID);
    }

    /**
     * التحقق من JWT. يُرجع الـ Claims عند النجاح ويلقي Exception عند الفشل.
     *
     * @throws UnexpectedValueException
     */
    public static function verify(string $token, string $expectedEvent = null, int $maxIatAgeSeconds = 120): array
    {
        $secret = self::secret();

        $decoded = JWT::decode($token, new Key($secret, self::ALG));
        $claims = (array) $decoded;

        if (($claims['iss'] ?? null) !== self::ISSUER) {
            throw new UnexpectedValueException('Invalid token issuer');
        }
        if (($claims['aud'] ?? null) !== self::AUDIENCE) {
            throw new UnexpectedValueException('Invalid token audience');
        }
        if (empty($claims['sub'])) {
            throw new UnexpectedValueException('Token missing subject');
        }
        if ($expectedEvent !== null && ($claims['event'] ?? null) !== $expectedEvent) {
            throw new UnexpectedValueException('Unexpected token event: ' . ($claims['event'] ?? 'null'));
        }

        // 🔒 فرض نافذة 60 ثانية على iat (طبقاً لميثاق الـ Webhook)
        $now = Carbon::now()->timestamp;
        $iat = (int) ($claims['iat'] ?? 0);
        if ($iat <= 0 || ($now - $iat) > $maxIatAgeSeconds) {
            throw new UnexpectedValueException('Token iat outside acceptable window');
        }

        return $claims;
    }

    /**
     * استخراج الـ Bearer Token من الـ Authorization Header.
     */
    public static function extractBearerToken(?string $authorizationHeader): ?string
    {
        if (!$authorizationHeader) {
            return null;
        }
        if (stripos($authorizationHeader, 'Bearer ') !== 0) {
            return null;
        }
        $token = trim(substr($authorizationHeader, 7));
        return $token !== '' ? $token : null;
    }

    /**
     * قائمة سوداء بالسرود المعروفة بأنها مكشوفة (مُسربة) — يُمنع بدء التطبيق
     * عند وجود أي منها في البيئة، لأن إعادة استخدامها ستسمح بتوقيع التوكنات.
     *
     * (SEC-CRIT-01 — أُضيفت 2026-07-09 بعد تسريب السلسلة القديمة.)
     */
    private const COMPROMISED_SECRETS = [
        'Makeen_Enterprise_VOD_Secret_Key_2026_!@#',
        'Makeen_Enterprise_VOD_Secret_Key_2026_',
        'changeme',
        'secret',
        'test',
        'dev',
        'default',
    ];

    /**
     * الحصول على السر المستخدم للتوقيع (يأخذ من الـ env مباشرة لتجنب الـ cache الـ stale).
     *
     * SECURITY: نرفض صراحةً:
     *  - السرود الفارغة
     *  - السرود المعروفة بأنها مسرّبة (قائمة سوداء)
     *  - السرود الأقصر من 32 بايتاً (غير قادرة على مقاومة هجوم القوة العمياء)
     *  - السرود التي لا تحتوي على أي تنوع (نفس الحرف/الرقم مكرر)
     */
    private static function secret(): string
    {
        $secret = config('services.video.jwt_secret') ?: env('JWT_SECRET');

        if (empty($secret)) {
            throw new \RuntimeException(
                'JWT_SECRET is not configured. Generate one with `openssl rand -base64 48` ' .
                'and set it in your .env file. Refusing to start.'
            );
        }

        // Refuse to run with a known-leaked or trivially weak secret.
        $stripped = trim($secret, "\" \t\n\r\0\x0B");
        foreach (self::COMPROMISED_SECRETS as $compromised) {
            if (hash_equals($compromised, $stripped) || hash_equals($compromised, $secret)) {
                throw new \RuntimeException(
                    'JWT_SECRET matches a known-compromised value. This secret has been leaked ' .
                    'and MUST be rotated immediately. Generate a new one with `openssl rand -base64 48`. ' .
                    'Refusing to start.'
                );
            }
        }

        if (strlen($stripped) < 32) {
            throw new \RuntimeException(
                'JWT_SECRET must be at least 32 characters of high-entropy data. ' .
                'Generate one with `openssl rand -base64 48`. Refusing to start.'
            );
        }

        // Detect trivially low-entropy secrets (e.g. "aaaa...aaaa", "1111...1111").
        $uniqueChars = count(array_unique(str_split($stripped)));
        if ($uniqueChars < 8) {
            throw new \RuntimeException(
                'JWT_SECRET has insufficient entropy (only ' . $uniqueChars . ' unique characters). ' .
                'Use `openssl rand -base64 48` to generate a high-entropy value. Refusing to start.'
            );
        }

        return $stripped;
    }
}
