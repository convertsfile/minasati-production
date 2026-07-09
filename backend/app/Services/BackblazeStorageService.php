<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http; // 🚀 استخدام الـ Http Facade بدلاً من cURL
use Illuminate\Support\Facades\Log;

class BackblazeStorageService
{
    /**
     * SEC-MAJOR-02: explicit allow-list for keys that may live in the public
     * bucket and be served via unsigned URLs. Anything not matched here is
     * routed to the private bucket and must be served via getSignedUrl().
     *
     * "uploads/*" is intentionally NOT in this list — the historical setup
     * shipped user ID cards, payment proofs, and homework submissions to
     * the public bucket, which let anyone with the URL access them.
     */
    private const PUBLIC_BUCKET_PREFIX = 'public-assets/';

    private ?string $keyId;
    private ?string $applicationKey;
    private ?string $privateBucketId;
    private ?string $privateBucketName;
    private ?string $publicBucketId;
    private ?string $publicBucketName;
    private ?string $region;
    private ?string $endpoint;

    private ?string $authToken = null;
    private ?string $apiUrl = null;
    private ?string $downloadUrl = null;
    private ?string $accountId = null;

    public function __construct()
    {
        $this->keyId = config('services.backblaze.key_id');
        $this->applicationKey = config('services.backblaze.application_key');

        $this->privateBucketId = config('services.backblaze.bucket') ?: env('B2_BUCKET_ID');
        $this->privateBucketName = config('services.backblaze.bucket_name') ?: env('B2_BUCKET');

        $this->publicBucketId = config('services.backblaze.bucket_public') ?: env('B2_BUCKET_ID_PUBLIC');
        $this->publicBucketName = config('services.backblaze.bucket_name_public') ?: env('B2_BUCKET_PUBLIC');

        $this->region = config('services.backblaze.region', 'us-east-005');
        $this->endpoint = config('services.backblaze.endpoint');

        if (empty($this->keyId) || empty($this->applicationKey)) {
            Log::error('Backblaze B2 Config Missing: Check your .env file');
        }
    }

    private function authenticate(): bool
    {
        $cached = Cache::get('b2_auth_token');
        if ($cached && is_array($cached) && isset($cached['authToken'])) {
            $this->authToken = $cached['authToken'];
            $this->apiUrl = $cached['apiUrl'];
            $this->downloadUrl = $cached['downloadUrl'] ?? $cached['apiUrl'];
            $this->accountId = $cached['accountId'] ?? null;
            return true;
        }

        // 🚀 كود نظيف جداً وأسهل في القراءة باستخدام Laravel Http
        $response = Http::withBasicAuth($this->keyId, $this->applicationKey)
            ->withoutVerifying()
            ->get('https://api.backblazeb2.com/b2api/v2/b2_authorize_account');

        if ($response->successful()) {
            $data = $response->json();
            $this->authToken = $data['authorizationToken'];
            $this->apiUrl = $data['apiUrl'];
            $this->downloadUrl = $data['downloadUrl'] ?? $data['apiUrl'];
            $this->accountId = $data['accountId'] ?? null;

            Cache::put('b2_auth_token', [
                'authToken' => $this->authToken,
                'apiUrl' => $this->apiUrl,
                'downloadUrl' => $this->downloadUrl,
                'accountId' => $this->accountId,
            ], now()->addHours(23));

            return true;
        }

        Log::error("B2 Auth failed: HTTP " . $response->status());
        return false;
    }

    public function upload(string $filePath, string $key): bool
    {
        if (!$this->authenticate()) {
            return false;
        }

        // SEC-MAJOR-02: every "uploads/*" key goes to the PRIVATE bucket.
        // The public bucket is reserved for non-sensitive, intentionally
        // public assets (lesson thumbnails, marketing assets, etc.). The
        // public/private decision is now driven by the explicit
        // self::PUBLIC_BUCKET_PREFIX constant, not by string-matching.
        $isPublic = str_starts_with($key, self::PUBLIC_BUCKET_PREFIX);

        try {
            $uploadUrlData = $this->getUploadUrl($isPublic);
            if (!$uploadUrlData || !isset($uploadUrlData['uploadUrl'])) {
                return false;
            }

            // 🚀 الدرع الأمني والأداء: حساب التشفير من مسار القرص مباشرة لحماية السيرفر من انهيار الـ RAM
            $sha1 = sha1_file($filePath);
            $fileContent = file_get_contents($filePath);

            $response = Http::withHeaders([
                'Authorization' => $uploadUrlData['authorizationToken'],
                'X-Bz-File-Name' => rawurlencode($key),
                'Content-Type' => 'b2/x-auto',
                'X-Bz-Content-Sha1' => $sha1,
            ])
                ->withoutVerifying()
                ->withBody($fileContent, 'b2/x-auto')
                ->post($uploadUrlData['uploadUrl']);

            if ($response->successful()) {
                return true;
            }

            Log::error("B2 Upload failed: HTTP " . $response->status() . " Body: " . $response->body());
        } catch (\Exception $e) {
            Log::error('B2 Upload exception: ' . $e->getMessage());
        }

        return false;
    }

    private function getUploadUrl(bool $isPublic = false): ?array
    {
        $targetBucketId = $isPublic ? $this->publicBucketId : $this->privateBucketId;

        if (!$targetBucketId) {
            Log::error('B2 Error: Could not resolve valid Bucket ID.');
            return null;
        }

        $response = Http::withToken($this->authToken, '') // إرسال التوكن بدون كلمة Bearer
            ->withoutVerifying()
            ->post($this->apiUrl . '/b2api/v2/b2_get_upload_url', [
                'bucketId' => $targetBucketId
            ]);

        if ($response->successful()) {
            return $response->json();
        }

        return null;
    }

    public function getUrl(string $key): string
    {
        if (str_starts_with($key, 'raw/')) {
            throw new \Exception('Access to raw videos is forbidden');
        }

        // SEC-MAJOR-02: an unsigned URL is only safe for keys that live in
        // the public bucket. Refuse to mint one for any user-uploaded key.
        $isPublic = $this->isPublicKey($key);
        if (! $isPublic) {
            Log::warning('BackblazeStorageService::getUrl() called for a non-public key. Use getSignedUrl() instead.', [
                'key_prefix' => $this->keyPrefix($key),
            ]);
            return '';
        }

        $bucketName = $this->publicBucketName;

        // 🚀 إزالة الرابط الثابت واستخدام الرابط الديناميكي
        $baseUrl = $this->downloadUrl ?? 'https://f005.backblazeb2.com';

        return $baseUrl . '/file/' . rawurlencode($bucketName) . '/' . str_replace('%2F', '/', rawurlencode($key));
    }

    public function getSignedUrl(string $key, int $expiresInSeconds = 3600): string
    {
        if (str_starts_with($key, 'raw/')) {
            throw new \Exception('Access to raw videos is forbidden');
        }
        if (!$this->authenticate()) {
            // If B2 is unreachable, refuse to leak the file via a public URL.
            Log::error('B2 authentication failed while generating signed URL; returning empty.', ['key' => $key]);
            return '';
        }

        $isPublic = $this->isPublicKey($key);
        $bucketName = $isPublic ? $this->publicBucketName : $this->privateBucketName;
        $bucketId = $isPublic ? $this->publicBucketId : $this->privateBucketId;

        if (empty($bucketId)) {
            Log::error('B2 bucket id is not configured; cannot generate signed URL.', [
                'is_public' => $isPublic,
                'key' => $key,
            ]);
            return '';
        }

        $response = Http::withToken($this->authToken, '')
            ->withoutVerifying()
            ->post($this->apiUrl . '/b2api/v2/b2_get_download_authorization', [
                'bucketId' => $bucketId,
                'fileNamePrefix' => '',
                'validDurationInSeconds' => $expiresInSeconds,
            ]);

        if ($response->successful()) {
            $data = $response->json();
            $downloadUrl = $this->downloadUrl ?? $this->apiUrl;
            $url = $downloadUrl . '/file/' . rawurlencode($bucketName) . '/' . $key;

            return $url . '?Authorization=' . rawurlencode($data['authorizationToken']);
        }

        Log::error('Failed to generate signed URL', [
            'status' => $response->status(),
            'body' => $response->body(),
        ]);
        return '';
    }

    public function delete(string $key): bool
    {
        if (!$this->authenticate()) {
            return false;
        }

        $isPublic = $this->isPublicKey($key);

        try {
            $fileId = $this->getFileId($key, $isPublic);
            if (!$fileId) {
                return true; // يعتبر محذوفاً إذا لم يُعثر عليه
            }

            $response = Http::withToken($this->authToken, '')
                ->withoutVerifying()
                ->post($this->apiUrl . '/b2api/v2/b2_delete_file_version', [
                    'fileId' => $fileId,
                    'fileName' => $key
                ]);

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('B2 Delete failed: ' . $e->getMessage());
        }

        return false;
    }

    public function getFileId(string $key, bool $isPublic = false): ?string
    {
        try {
            $targetBucketId = $isPublic ? $this->publicBucketId : $this->privateBucketId;

            $response = Http::withToken($this->authToken, '')
                ->withoutVerifying()
                ->post($this->apiUrl . '/b2api/v2/b2_list_file_versions', [
                    'bucketId' => $targetBucketId,
                    'maxFileCount' => 1,
                    'startFileName' => $key,
                ]);

            if ($response->successful()) {
                $files = $response->json()['files'] ?? [];
                foreach ($files as $file) {
                    if ($file['fileName'] === $key) {
                        return $file['fileId'];
                    }
                }
            }
        } catch (\Exception $e) {
            Log::error('B2 getFileId failed: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * SEC-MAJOR-02: a key is "public" (allowed in the public bucket) ONLY
     * if its top-level prefix is in the explicit allow-list. By default
     * NO user-uploaded key is public.
     */
    private function isPublicKey(string $key): bool
    {
        return str_starts_with($key, self::PUBLIC_BUCKET_PREFIX);
    }

    private function keyPrefix(string $key): string
    {
        $slash = strpos($key, '/');
        return $slash === false ? $key : substr($key, 0, $slash);
    }

}