<?php

namespace App\Console\Commands;

use App\Jobs\EncodeStudentVideo;
use App\Models\Lecture;
use App\Models\StudentVideoEncoding;
use App\Models\User;
use App\Services\BackblazeStorageService;
use App\Services\FFmpegEncodingService;
use App\Services\WalletService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DiagnoseVideoPlayback extends Command
{
    protected $signature = 'video:diagnose-playback {email}';

    protected $description = 'Diagnose video playback end-to-end';

    public function handle(BackblazeStorageService $b2Service): int
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();

        if (! $user) {
            $this->error("User not found: {$email}");

            return 1;
        }

        $this->info("User: {$user->email} (ID: {$user->id})");
        $this->info("Wallet: {$user->wallet_balance} points");
        $this->newLine();

        // Find lecture with raw video
        $lecture = Lecture::whereNotNull('b2_video_path')->first();
        if (! $lecture) {
            $this->error('No lecture with raw video found');

            return 1;
        }

        $this->info("Lecture: {$lecture->id} - {$lecture->title}");
        $this->info("Raw B2 path: {$lecture->b2_video_path}");
        $this->newLine();

        // Check course purchase
        $hasCourse = $user->courses()->where('course_id', $lecture->course_id)->exists();
        $this->info('Course purchased: '.($hasCourse ? 'YES' : 'NO'));

        if (! $hasCourse) {
            $this->warn('User has not purchased the course. Adding points and purchasing...');

            $course = $lecture->course;
            $this->info("Course price: {$course->price_points} points");

            // Add points if needed
            if ($user->wallet_balance < $course->price_points) {
                $needed = $course->price_points - $user->wallet_balance + 100;
                $this->info("Adding {$needed} points...");
                $walletService = app(WalletService::class);
                $walletService->topUp($user, $needed, 'manual', 'DIAGNOSE-'.time(), 'Diagnostic top-up');
                $user->refresh();
                $this->info("New balance: {$user->wallet_balance}");
            }

            // Purchase course
            DB::beginTransaction();
            try {
                $walletService = app(WalletService::class);
                $walletService->deduct($user, $course->price_points, "Purchase: {$course->title}", 'diag_purchase_'.time());

                $user->courses()->attach($course->id, [
                    'access_type' => 'purchase',
                    'reference' => 'diag_purchase_'.time(),
                    'granted_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // Create encoding record
                $encoding = StudentVideoEncoding::create([
                    'user_id' => $user->id,
                    'lecture_id' => $lecture->id,
                    'course_id' => $course->id,
                    'watermark_text' => $user->parent_phone ?? '0123456789',
                    'status' => 'pending',
                    'progress' => 0,
                ]);

                DB::commit();
                $this->info("Course purchased! Encoding ID: {$encoding->id}");
            } catch (\Exception $e) {
                DB::rollBack();
                $this->error('Purchase failed: '.$e->getMessage());

                return 1;
            }
        }

        // Get or create encoding
        $encoding = StudentVideoEncoding::where('user_id', $user->id)
            ->where('lecture_id', $lecture->id)
            ->first();

        if (! $encoding) {
            $this->error('No encoding record found');

            return 1;
        }

        $this->info("Encoding ID: {$encoding->id}");
        $this->info("Status: {$encoding->status}");
        $this->info('B2 path: '.($encoding->b2_video_path ?? 'N/A'));
        $this->newLine();

        // If not completed, run encoding now
        if ($encoding->status !== 'completed') {
            $this->info('Running encoding synchronously...');
            $job = new EncodeStudentVideo($encoding->id);
            $job->handle(
                app(FFmpegEncodingService::class),
                $b2Service
            );
            $encoding->refresh();
            $this->info("Encoding result: {$encoding->status}");
            if ($encoding->status === 'failed') {
                $this->error("Error: {$encoding->error_message}");

                return 1;
            }
        }

        // Generate signed URL
        $this->info('Generating signed URL...');
        try {
            $signedUrl = $b2Service->getSignedUrl($encoding->b2_video_path, 3600);
            $this->info("Signed URL: {$signedUrl}");
            $this->newLine();
        } catch (\Exception $e) {
            $this->error('Failed to generate signed URL: '.$e->getMessage());

            return 1;
        }

        // Test URL with HEAD request
        $this->info('Testing signed URL...');
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $signedUrl);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, true);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        $contentLength = curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
        curl_close($ch);

        $this->info("HTTP Code: {$httpCode}");
        $this->info('Content-Type: '.($contentType ?: 'N/A'));
        $this->info('Content-Length: '.($contentLength > 0 ? $contentLength : 'N/A'));
        $this->newLine();

        // Check for CORS headers
        $this->info('Checking CORS headers...');
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $signedUrl);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Origin: http://localhost:3000',
            'Access-Control-Request-Method: GET',
        ]);
        $corsResponse = curl_exec($ch);
        curl_close($ch);

        $this->line('CORS Response headers:');
        $headers = explode("\n", $corsResponse);
        foreach ($headers as $h) {
            $h = trim($h);
            if (stripos($h, 'Access-Control') !== false || stripos($h, 'Content-') !== false) {
                $this->line("  {$h}");
            }
        }
        $this->newLine();

        // Download a small chunk to verify it's a valid video
        $this->info('Downloading first 1MB to verify video format...');
        $tempFile = storage_path('app/temp_video_check.mp4');
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $signedUrl);
        curl_setopt($ch, CURLOPT_RANGE, '0-1048575'); // First 1MB
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $chunk = curl_exec($ch);
        $chunkCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($chunkCode === 200 || $chunkCode === 206) {
            file_put_contents($tempFile, $chunk);
            $this->info('Downloaded '.strlen($chunk).' bytes');

            // Check magic bytes
            $magic = bin2hex(substr($chunk, 0, 12));
            $this->info("Magic bytes: {$magic}");

            if (strpos($magic, '66747970') !== false || strpos($magic, '6d6f6f76') !== false) {
                $this->info('File signature: Valid MP4/MOV container');
            } else {
                $this->warn('File signature: NOT a valid MP4 (may be HTML error page or corrupted)');
            }

            @unlink($tempFile);
        } else {
            $this->error("Failed to download chunk: HTTP {$chunkCode}");
        }

        $this->newLine();
        $this->info('=== DIAGNOSIS SUMMARY ===');
        if ($httpCode === 200 && stripos($contentType, 'video') !== false) {
            $this->info('URL is valid and returns video content');
        } elseif ($httpCode === 200) {
            $this->warn("URL returns content but wrong Content-Type: {$contentType}");
        } else {
            $this->error("URL failed with HTTP {$httpCode}");
        }

        return 0;
    }
}
