<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str; // 🚀 استدعاء مكتبة النصوص

class FileUploadService
{
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
                $url = $this->b2Service->getUrl($key);
                Log::info("Successfully uploaded image to B2: {$url}");

                return [
                    'public_id' => $key,
                    'url' => $url,
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