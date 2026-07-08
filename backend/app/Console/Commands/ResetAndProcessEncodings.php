<?php

namespace App\Console\Commands;

use App\Jobs\EncodeStudentVideo;
use App\Models\StudentVideoEncoding;
use App\Models\User;
use App\Services\BackblazeStorageService;
use App\Services\FFmpegEncodingService;
use Illuminate\Console\Command;

class ResetAndProcessEncodings extends Command
{
    protected $signature = 'encoding:reset-and-process {email?}';

    protected $description = 'Reset failed encodings to pending and process them';

    public function handle(): int
    {
        $email = $this->argument('email');

        if ($email) {
            $user = User::where('email', $email)->first();
            if (! $user) {
                $this->error("User not found: {$email}");

                return 1;
            }
            $encodings = StudentVideoEncoding::where('user_id', $user->id)
                ->whereIn('status', ['failed', 'pending'])
                ->get();
        } else {
            $encodings = StudentVideoEncoding::whereIn('status', ['failed', 'pending'])->get();
        }

        if ($encodings->isEmpty()) {
            $this->warn('No failed or pending encodings found.');

            return 0;
        }

        $this->info("Found {$encodings->count()} encoding(s) to process.");

        foreach ($encodings as $encoding) {
            $this->info("Processing encoding ID: {$encoding->id}");

            // Reset failed to pending
            $encoding->update([
                'status' => 'pending',
                'error_message' => null,
                'progress' => 0,
            ]);

            // Process immediately (synchronously)
            try {
                $job = new EncodeStudentVideo($encoding->id);
                $job->handle(
                    app(FFmpegEncodingService::class),
                    app(BackblazeStorageService::class)
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
            }

            $this->newLine();
        }

        $this->info('Done!');

        return 0;
    }
}
