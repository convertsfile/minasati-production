<?php

namespace App\Http\Controllers\Video;

use App\Events\VideoProcessingProgress;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse; // 🚀 استدعاء الميثاق الموحد
use App\Models\Lecture;
use App\Models\LectureProgress;
use App\Models\User;
use App\Services\InternalJwtService;
use App\Services\Metrics\ApplicationMetrics;
use App\Services\PlanService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class VideoEngineController extends Controller
{
    public function __construct(
        private ApplicationMetrics $metrics
    ) {}

    /**
     * 1. إصدار تذكرة الرفع (Upload Ticket) للسحابة
     */
    public function getUploadToken(Lecture $lecture)
    {
        // 🚀 حماية فحص الباقة: تم وضعه داخل try-catch لمنع الانهيار الصامت
        try {
            if (class_exists(PlanService::class)) {
                $planLimits = PlanService::getCurrentPlanLimits();
                $maxStorageBytes = ($planLimits['storage_gb'] ?? 50) * 1024 * 1024 * 1024;
                $currentStorageBytes = PlanService::getStorageUsedBytes();

                if ($currentStorageBytes >= $maxStorageBytes) {
                    return ApiResponse::error('لقد بلغت الحد الأقصى للمساحة المسموحة لباقة الاشتراك.', 'ERR_STORAGE_LIMIT', 403);
                }
            }
        } catch (\Exception $e) {
            Log::warning('Plan limits check bypassed: ' . $e->getMessage());
        }

        try {
            // 🚀 قراءة ذكية للباكيت (لو فشل الـ config يقرأ من الـ env مباشرة)
            $bucket = config('filesystems.disks.b2.bucket') ?: env('B2_BUCKET_NAME');
            if (!$bucket) {
                throw new \Exception('اسم الباكيت (Bucket) غير معرف في الإعدادات.');
            }

            $fileName = "lectures/{$lecture->id}/raw_video_" . time() . '.mp4';

            // 🚀 استخراج العميل S3 بشكل آمن
            $s3Disk = Storage::disk('b2');
            if (!method_exists($s3Disk, 'getClient')) {
                throw new \Exception('قرص B2 في Laravel لا يدعم استخراج العميل. تأكد أن الـ driver مضبوط على s3 في ملف filesystems.php');
            }

            $client = $s3Disk->getClient();

            $command = $client->getCommand('PutObject', [
                'Bucket' => $bucket,
                'Key' => $fileName,
                'ContentType' => 'video/mp4',
            ]);

            $request = $client->createPresignedRequest($command, '+60 minutes');
            $presignedUrl = (string) $request->getUri();

            // 🚀 تحديث حالة المحاضرة
            $lecture->update([
                'raw_key' => $fileName,
                'video_status' => 'uploading',
            ]);

            return ApiResponse::success([
                'upload_url' => $presignedUrl,
                'uploadUrl' => $presignedUrl, // إرسال الصيغتين لتوافقية الـ Frontend المطلقة
                'fileKey' => $fileName,
            ], 'تم توليد رابط الرفع الآمن بنجاح');

        } catch (\Exception $e) {
            Log::error('Failed to generate Pre-signed URL: ' . $e->getMessage());

            // 🚀 السحر هنا: إرسال سبب الخطأ التقني الحقيقي للواجهة بدلاً من الرسالة العامة
            return ApiResponse::error('فشل الرفع بسبب: ' . $e->getMessage(), 'ERR_B2_PRESIGNED', 500);
        }
    }

    /**
     * 2. استقبال إشعار الانتهاء من محرك Go (Webhook)
     */
    public function handleWebhook(Request $request)
    {
        // 🚀 أمان عالي: حماية الـ Webhook بـ JWT موقّع (HS256) بدلاً من مقارنة نصّية
        // الـ Token يأتي في الـ Header: Authorization: Bearer <jwt>
        $bearer = InternalJwtService::extractBearerToken($request->header('Authorization'));
        if (!$bearer) {
            $this->metrics->recordWebhook('vod_engine', 'video.encoded', 'invalid_signature');
            return ApiResponse::error('Unauthorized: missing bearer token', 'ERR_UNAUTHORIZED', 403);
        }

        try {
            $claims = InternalJwtService::verify($bearer, 'video.encoded', 120);
        } catch (\Throwable $e) {
            Log::warning('Webhook JWT verification failed: ' . $e->getMessage());
            $this->metrics->recordWebhook('vod_engine', 'video.encoded', 'invalid_signature');
            return ApiResponse::error('Unauthorized: ' . $e->getMessage(), 'ERR_UNAUTHORIZED', 403);
        }

        $request->validate([
            'lecture_id' => 'required',
            'status' => 'required',
            'size_bytes' => 'nullable|integer',
        ]);

        $lecture = Lecture::find($request->lecture_id);

        if (!$lecture) {
            $this->metrics->recordWebhook('vod_engine', 'video.encoded', 'not_found');
            return ApiResponse::error('Lecture not found', 'ERR_NOT_FOUND', 404);
        }

        $lecture->video_status = $request->status;
        $lecture->encoding_status = $request->status;

        if ($request->filled('m3u8_path')) {
            $lecture->m3u8_path = $request->m3u8_path;
        }
        if ($request->filled('encryption_key')) {
            $lecture->encryption_key = $request->encryption_key;
        }
        if ($request->has('size_bytes')) {
            $lecture->size_bytes = $request->size_bytes;
        }

        $lecture->save();

        // 🚀 RELIABILITY-MAJOR-02: record the webhook outcome so
        // operators can see video-encoded events flowing through
        // Prometheus (source="vod_engine", event="video.encoded",
        // outcome=processed | not_found | invalid_signature).
        $this->metrics->recordWebhook('vod_engine', 'video.encoded', 'processed');

        return ApiResponse::success(['lectureId' => $lecture->id], 'Webhook processed');
    }

    /**
     * 3. تزويد الفرونت إند برابط التشغيل (Playback URL)
     */
    public function getPlaybackUrl(Lecture $lecture, Request $request)
    {
        $user = $request->user();

        // 🚀 الإصلاح 1: فحص الاشتراك باستخدام العلاقات الصحيحة
        $isSubscribed = $user->role === 'admin' || $user->courses()->where('courses.id', $lecture->course_id)->exists();

        if (!$isSubscribed) {
            return ApiResponse::error('غير مصرح. أنت لست مشتركاً في هذا الكورس.', 'ERR_UNAUTHORIZED', 403);
        }

        // 🚀 الإصلاح 2: استخدام اللوجيك المركزي (المحرك التعليمي) وحذف الاستعلامات عن جداول ملغية
        if ($user->role !== 'admin' && !$user->hasUnlockedLecture($lecture)) {
            return ApiResponse::error('هذه المحاضرة مقفلة. يرجى إكمال المحاضرات أو الاختبارات السابقة أولاً.', 'ERR_LECTURE_LOCKED', 403);
        }

        // نظام الحماية من المشاركة: تحديد عدد المشاهدات
        if ($user->role !== 'admin' && $lecture->max_views !== null) {
            $progress = LectureProgress::firstOrCreate(
                ['user_id' => $user->id, 'lecture_id' => $lecture->id]
            );

            if ($progress->views_count >= $lecture->max_views) {
                return ApiResponse::error('لقد وصلت للحد الأقصى لعدد مرات مشاهدة هذا الفيديو.', 'ERR_VIEW_LIMIT_REACHED', 403);
            }
            $progress->increment('views_count');
        }

        if ($lecture->video_status !== 'completed' || !$lecture->m3u8_path) {
            return ApiResponse::error('الفيديو قيد المعالجة حالياً، يرجى المحاولة بعد قليل.', 'ERR_VIDEO_NOT_READY', 400);
        }

        // 🚀 توليد Playback Session جديد وإلغاء أي جلسة سابقة لنفس الفيديو لمنع المشاهدة المزدوجة
        $sessionId = Str::random(40);
        Cache::put("playback_session_{$user->id}_{$lecture->id}", $sessionId, now()->addMinutes(120));

        $playbackUrl = url("/api/video/secure-playlist/{$lecture->id}?session_id={$sessionId}");
        $watermark = "{$user->full_name} - {$user->phone}";

        return ApiResponse::success([
            'lectureId' => $lecture->id,
            'status' => $lecture->video_status,
            'playbackUrl' => $playbackUrl,
            'watermark' => $watermark,
        ], 'تم توليد جلسة التشغيل بنجاح');
    }

    /**
     * 4. تسليم مفتاح التشفير بأمان (Encryption Key) 
     * ⚠️ (تُرجع Binary خام لتوافقية الـ Video Player - لا تستخدم JSON)
     */
    public function getEncryptionKey(Request $request, Lecture $lecture)
    {
        $user = $request->user();

        // 🚀 إزالة الـ Abort الأعمى واستبداله برسائل دقيقة لكشف الأخطاء
        if ($lecture->video_status !== 'completed') {
            return response('Video status is not completed in database', 400);
        }
        if (!$lecture->encryption_key) {
            return response('Encryption key is missing or invalid in database', 400);
        }

        if ($user->role !== 'admin') {
            $isSubscribed = $user->courses()->where('courses.id', $lecture->course_id)->exists();
            if (!$isSubscribed || !$user->hasUnlockedLecture($lecture)) {
                return response('Access Denied', 403);
            }

            $sessionId = $request->query('session_id');
            $cacheKey = "playback_session_{$user->id}_{$lecture->id}";

            if (!$sessionId || \Illuminate\Support\Facades\Cache::get($cacheKey) !== $sessionId) {
                return response('Session Expired or Invalid', 403);
            }
        }

        $rawKey = $lecture->encryption_key;

        // 🚀 السحر هنا: دعم ذكي لصيغ التشفير، يختبر الـ Hex أولاً، وإن فشل يستخدم Base64
        if (ctype_xdigit($rawKey)) {
            $binaryKey = hex2bin($rawKey);
        } else {
            $binaryKey = base64_decode($rawKey, true);
        }

        if ($binaryKey === false) {
            return response('Cryptographic error: Invalid key format from Go Engine', 500);
        }

        return response($binaryKey, 200)
            ->header('Content-Type', 'application/octet-stream')
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache');
    }

    /**
     * 5. أمر بدء التشفير (Start Processing)
     */
    public function startProcessing(Lecture $lecture)
    {
        if (!$lecture->raw_key) {
            return ApiResponse::error('No video found to process', 'ERR_NO_RAW_VIDEO', 400);
        }

        try {
            $planLimits = PlanService::getCurrentPlanLimits();
            $goUrl = config('services.video.go_url', env('GO_ENGINE_URL')) . '/api/v1/video/process';
            $token = InternalJwtService::issue((string) $lecture->id, 'video.process', 60);
            $response = Http::timeout(5)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $token,
                    'X-Internal-Key' => 'vod-process-v1',
                ])
                ->post($goUrl, [
                    'lecture_id' => (string) $lecture->id,
                    'raw_key' => $lecture->raw_key,
                    'qualities' => $planLimits['qualities'],
                ]);

            if ($response->successful()) {
                $lecture->update(['video_status' => 'processing']);
                return ApiResponse::success(null, 'بدأت عملية معالجة الفيديو بنجاح');
            }

            return ApiResponse::error('فشل في إطلاق محرك المعالجة', 'ERR_ENGINE_TRIGGER', 500);
        } catch (\Exception $e) {
            return ApiResponse::error('محرك المعالجة غير متصل حالياً', 'ERR_ENGINE_OFFLINE', 500);
        }
    }

    /**
     * 6. تحديث نسبة التشفير المباشرة
     */
    public function updateProgress(Request $request, Lecture $lecture)
    {
        $bearer = InternalJwtService::extractBearerToken($request->header('Authorization'));
        if (!$bearer) {
            return ApiResponse::error('Unauthorized: missing bearer token', 'ERR_UNAUTHORIZED', 403);
        }

        try {
            InternalJwtService::verify($bearer, 'video.progress', 120);
        } catch (\Throwable $e) {
            Log::warning('updateProgress JWT verification failed: ' . $e->getMessage());
            return ApiResponse::error('Unauthorized: ' . $e->getMessage(), 'ERR_UNAUTHORIZED', 403);
        }

        $phase = $request->input('phase', 'processing');
        $percent = (int) $request->input('percent', 0);
        broadcast(new VideoProcessingProgress($lecture->id, $phase, $percent));

        return ApiResponse::success(null, 'Progress broadcasted');
    }

    /**
     * 7. قائمة التشغيل الآمنة (Secure Playlist)
     * ⚠️ (تُرجع نص M3U8 عادي لتوافقية الـ Video Player - لا تستخدم JSON)
     */
    public function getSecurePlaylist(Request $request, Lecture $lecture)
    {
        $user = $request->user();

        $isSubscribed = $user->role === 'admin' || $user->courses()->where('courses.id', $lecture->course_id)->exists();
        if (!$isSubscribed || ($user->role !== 'admin' && !$user->hasUnlockedLecture($lecture))) {
            return response('Unauthorized or Locked', 403);
        }

        // 🚀 رسائل خطأ دقيقة بدلاً من الـ 404 المبهم
        if ($lecture->video_status !== 'completed') {
            return response('Video not ready: status is ' . $lecture->video_status, 400);
        }
        if (empty($lecture->m3u8_path)) {
            return response('Video not ready: m3u8_path is empty in database', 400);
        }

        if ($user->role !== 'admin') {
            $sessionId = $request->query('session_id');
            $cacheKey = "playback_session_{$user->id}_{$lecture->id}";
            if (!$sessionId || \Illuminate\Support\Facades\Cache::get($cacheKey) !== $sessionId) {
                return response('Invalid or expired playback session', 403);
            }
        }

        $rawVariant = $request->query('variant', 'master.m3u8');
        $subPath = str_replace('\\', '/', $rawVariant);
        $m3u8Key = dirname($lecture->m3u8_path) . '/' . $subPath;

        $client = \Illuminate\Support\Facades\Storage::disk('b2')->getClient();
        $bucket = config('filesystems.disks.b2.bucket');

        try {
            $cmd = $client->getCommand('GetObject', ['Bucket' => $bucket, 'Key' => $m3u8Key]);
            $tempUrl = (string) $client->createPresignedRequest($cmd, '+5 minutes')->getUri();

            $response = \Illuminate\Support\Facades\Http::withoutVerifying()->get($tempUrl);

            if (!$response->successful()) {
                return response('Failed to read cloud: ' . $response->status(), 500);
            }

            $content = $response->body();
        } catch (\Exception $e) {
            return response('Cloud Exception: ' . $e->getMessage(), 500);
        }

        $lines = explode("\n", $content);
        $secureContent = '';
        $baseDir = dirname($m3u8Key);

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line))
                continue;

            if (!str_starts_with($line, '#')) {
                $cleanLine = str_replace('\\', '/', $line);

                if (str_ends_with($cleanLine, '.m3u8')) {
                    $sessionId = $request->query('session_id');
                    // 🚀 تعديل جذري 1: إجبار المسار ليكون نسبياً (Relative) لكي يلتقطه الـ Interceptor بنجاح
                    $variantUrl = "/api/video/secure-playlist/{$lecture->id}?variant=" . urlencode($cleanLine) . "&session_id={$sessionId}";
                    $secureContent .= $variantUrl . "\n";
                } elseif (str_ends_with($cleanLine, '.ts')) {
                    $segmentKey = $baseDir . '/' . $cleanLine;
                    $cmd = $client->getCommand('GetObject', ['Bucket' => $bucket, 'Key' => $segmentKey]);
                    $secureContent .= (string) $client->createPresignedRequest($cmd, '+5 minutes')->getUri() . "\n";
                }
            } else {
                if (str_starts_with($line, '#EXT-X-KEY:')) {
                    $sessionId = $request->query('session_id');
                    // 🚀 تعديل جذري 2: إجبار مسار المفتاح ليكون نسبياً للهروب من تضارب الدومينات
                    $keyUrl = "/api/video/key/{$lecture->id}?session_id={$sessionId}";
                    $line = preg_replace('/URI="[^"]+"/', 'URI="' . $keyUrl . '"', $line);
                }
                $secureContent .= $line . "\n";
            }
        }

        return response($secureContent, 200)
            ->header('Content-Type', 'application/vnd.apple.mpegurl');
    }
}