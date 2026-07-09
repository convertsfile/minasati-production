<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str; // 🚀 استدعاء مكتبة النصوص

class FileUploadService
{
    /**
     * SEC-MAJOR-02: all user uploads are private.
     *
     * Historical: the platform used a "uploads/" prefix to route user
     * uploads to the public B2 bucket, then returned a plain unsigned
     * URL. That meant anyone with the URL could access ID-card images,
     * payment-proof screenshots, homework submissions, and admin
     * attachments without authentication.
     *
     * New behaviour: uploads go to the PRIVATE bucket and the URL returned
     * is a 5-minute signed download authorization. Controllers that need
     * to surface the URL to a logged-in user must call
     * BackblazeStorageService::getSignedUrl() with a controller-side
     * authorization check.
     */
    private const BUCKET_PREFIX = 'uploads';

    // 🚀 تطبيق حقن التبعية (Dependency Injection) لمعمارية نظيفة
    public function __construct(private BackblazeStorageService $b2Service)
    {
    }

    public function upload(UploadedFile $file, string $folder = 'general'): ?array
    {
        $keyId = config('services.backblaze.key_id');
        if (empty($keyId)) {
            Log::error('Backblaze B2 is not configured in .env');
            return null;
        }

        // 🚀 الأمان: الاعتماد على الـ MimeType الحقيقي للملف بدلاً من الاسم المزور
        $extension = $file->extension() ?: 'png';

        // 🚀 الأداء: استخدام UUID يمنع تضارب أسماء الملفات تماماً حتى لو رُفعت مليون صورة في نفس الثانية
        $filename = Str::uuid()->toString() . '.' . $extension;
        $key = "{$this->folderToKey($folder)}/{$filename}";

        try {
            Log::info("Attempting to upload file to B2: {$key}");

            // استخدام الكائن المحقون
            $success = $this->b2Service->upload($file->getRealPath(), $key);

            if ($success) {
                // SEC-MAJOR-02: store a SIGNED URL with a 5-minute lifetime
                // instead of a plain unsigned URL. The raw key is returned
                // alongside it so the controller can re-sign on demand.
                $signedUrl = $this->b2Service->getSignedUrl($key, 300);
                Log::info("Successfully uploaded file to B2 (private): {$key}");

                return [
                    'public_id' => $key,
                    'url' => $signedUrl,
                    'format' => $extension,
                ];
            }

            Log::error("FileUploadService: Upload failed for key {$key}");
        } catch (\Exception $e) {
            Log::error('FileUploadService Exception: ' . $e->getMessage());
        }

        return null;
    }

    public function delete(string $key): bool
    {
        return $this->b2Service->delete($key);
    }

    private function folderToKey(string $folder): string
    {
        return self::BUCKET_PREFIX . '/' . trim($folder, '/');
    }
}