<?php

namespace App\Console\Commands;

use App\Jobs\EncodeStudentVideo;
use App\Models\StudentVideoEncoding;
use App\Models\User;
use App\Services\BackblazeStorageService;
use App\Services\FFmpegEncodingService;
use Illuminate\Console\Command;

class ReencodeLecture1 extends Command
{
    protected $signature = 'encoding:reencode-lecture1 {email}';

    protected $description = 'Delete broken encoding and re-encode lecture 1';

    public function handle(BackblazeStorageService $b2Service): int
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();

        if (! $user) {
            $this->error("User not found: {$email}");

            return 1;
        }

        $encoding = StudentVideoEncoding::where('user_id', $user->id)
            ->where('lecture_id', 1)
            ->first();

        if (! $encoding) {
            $this->warn('No encoding found for lecture 1');

            return 0;
        }

        $this->info("Found encoding ID: {$encoding->id}, status: {$encoding->status}");

        // Delete old encoded file from B2 if exists
        if ($encoding->b2_video_path) {
            $this->info("Deleting old encoded file from B2: {$encoding->b2_video_path}");
            $b2Service->delete($encoding->b2_video_path);
        }

        // Reset encoding record
        $encoding->update([
            'status' => 'pending',
            'b2_video_path' => null,
            'error_message' => null,
            'progress' => 0,
            'started_at' => null,
            'completed_at' => null,
        ]);

        $this->info('Encoding record reset to pending');

        // Run encoding synchronously
        $this->info('Starting encoding...');
        try {
            $job = new EncodeStudentVideo($encoding->id);
            $job->handle(
                app(FFmpegEncodingService::class),
                $b2Service
            );

            $encoding->refresh();
            $this->info("Result: {$encoding->status}");

            if ($encoding->status === 'completed') {
                $this->info("✓ Video ready: {$encoding->b2_video_path}");
            } elseif ($encoding->status === 'failed') {
                $this->error("✗ Failed: {$encoding->error_message}");
            }
        } catch (\Exception $e) {
            $this->error('Exception: '.$e->getMessage());
            $this->line($e->getTraceAsString());
        }

        return 0;
    }
}
