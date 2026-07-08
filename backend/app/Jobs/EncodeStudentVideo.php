<?php

namespace App\Jobs;

use App\Models\StudentVideoEncoding;
use App\Services\BackblazeStorageService;
use App\Services\FFmpegEncodingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class EncodeStudentVideo implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 3600; // 1 hour timeout

    public int $tries = 1; // Don't retry automatically

    public function __construct(
        public int $studentVideoEncodingId
    ) {}

    public function handle(
        FFmpegEncodingService $ffmpegService,
        BackblazeStorageService $b2Service
    ): void {
        $encoding = StudentVideoEncoding::find($this->studentVideoEncodingId);

        if (! $encoding) {
            Log::error('StudentVideoEncoding not found', ['id' => $this->studentVideoEncodingId]);

            return;
        }

        try {
            // Update status to processing
            $encoding->update([
                'status' => 'processing',
                'started_at' => now(),
            ]);

            $lecture = $encoding->lecture;
            $user = $encoding->user;

            // SECURITY: Verify raw video path starts with 'raw/'
            $rawVideoPath = $lecture->b2_video_path;
            if (! $rawVideoPath) {
                throw new \Exception('No raw video found for lecture');
            }

            if (! str_starts_with($rawVideoPath, 'raw/')) {
                throw new \Exception('Invalid raw video path - must start with raw/');
            }

            $tempInputPath = storage_path('app/temp_encoding/input_'.$encoding->id.'.mp4');
            $tempOutputPath = storage_path('app/temp_encoding/output_'.$encoding->id.'.mp4');

            // Ensure temp directory exists
            if (! is_dir(dirname($tempInputPath))) {
                mkdir(dirname($tempInputPath), 0755, true);
            }

            // Download raw video from B2 (server-side only, never exposed to students)
            Log::info('Downloading raw video from B2', [
                'encoding_id' => $encoding->id,
                'b2_path' => $rawVideoPath,
            ]);

            $downloadSuccess = $b2Service->downloadFile($rawVideoPath, $tempInputPath);
            if (! $downloadSuccess) {
                throw new \Exception('Failed to download raw video from B2');
            }

            // Encode with student's parent phone watermark
            Log::info('Starting video encoding', [
                'encoding_id' => $encoding->id,
                'watermark' => $encoding->watermark_text,
            ]);

            // SECURITY: Encoded videos are stored in 'videos/student_{id}/' prefix
            // This ensures each student has their own unique video with watermark
            $b2OutputPath = "videos/student_{$user->id}/lecture_{$lecture->id}.mp4";

            $result = $ffmpegService->encodeWithWatermark(
                $tempInputPath,
                $tempOutputPath,
                $encoding->watermark_text,
                true, // Upload to B2
                $b2OutputPath
            );

            if (! $result['success']) {
                throw new \Exception($result['error'] ?? 'Encoding failed');
            }

            // Update encoding record
            $encoding->update([
                'status' => 'completed',
                'b2_video_path' => $b2OutputPath,
                'progress' => 100,
                'completed_at' => now(),
            ]);

            // Clean up temporary files
            if (file_exists($tempInputPath)) {
                unlink($tempInputPath);
            }
            if (file_exists($tempOutputPath)) {
                unlink($tempOutputPath);
            }

            Log::info('Video encoding completed successfully', [
                'encoding_id' => $encoding->id,
                'b2_path' => $b2OutputPath,
            ]);

        } catch (\Exception $e) {
            // Update encoding record with error
            $encoding->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            // Clean up temporary files
            if (isset($tempInputPath) && file_exists($tempInputPath)) {
                unlink($tempInputPath);
            }
            if (isset($tempOutputPath) && file_exists($tempOutputPath)) {
                unlink($tempOutputPath);
            }

            Log::error('Video encoding failed', [
                'encoding_id' => $encoding->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}
