<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http; // 🚀 استخدام الـ Http Facade بدلاً من cURL
use Illuminate\Support\Facades\Log;

class BackblazeStorageService
{
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

        $isPublic = str_starts_with($key, 'uploads/');

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

        $isPublic = str_starts_with($key, 'uploads/');
        $bucketName = $isPublic ? $this->publicBucketName : $this->privateBucketName;

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
            return $this->getUrl($key);
        }

        $isPublic = str_starts_with($key, 'uploads/');
        $bucketName = $isPublic ? $this->publicBucketName : $this->privateBucketName;
        $bucketId = $isPublic ? $this->publicBucketId : $this->privateBucketId;

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

        return $this->getUrl($key);
    }

    public function delete(string $key): bool
    {
        if (!$this->authenticate()) {
            return false;
        }

        $isPublic = str_starts_with($key, 'uploads/');

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

}