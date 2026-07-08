<?php

namespace App\Console\Commands;

use App\Jobs\EncodeStudentVideo;
use App\Models\StudentVideoEncoding;
use App\Services\BackblazeStorageService;
use App\Services\FFmpegEncodingService;
use Illuminate\Console\Command;

class ProcessPendingEncodings extends Command
{
    protected $signature = 'encoding:process-pending {--limit=5}';

    protected $description = 'Process pending video encodings manually (no queue worker needed)';

    public function handle(): int
    {
        $limit = (int) $this->option('limit');

        $pending = StudentVideoEncoding::where('status', 'pending')
            ->orWhere('status', 'failed')
            ->limit($limit)
            ->get();

        if ($pending->isEmpty()) {
            $this->warn('No pending or failed encodings found.');

            return 0;
        }

        $this->info("Processing {$pending->count()} encoding(s)...");

        foreach ($pending as $encoding) {
            $this->info("Processing encoding ID: {$encoding->id} (User: {$encoding->user->email}, Lecture: {$encoding->lecture->title})");

            // Reset failed status to pending
            if ($encoding->status === 'failed') {
                $encoding->update(['status' => 'pending', 'error_message' => null]);
            }

            // Dispatch the job synchronously (runs immediately, no queue worker needed)
            $job = new EncodeStudentVideo($encoding->id);
            $job->handle(
                app(FFmpegEncodingService::class),
                app(BackblazeStorageService::class)
            );

            $encoding->refresh();
            $this->info("Result: {$encoding->status}");

            if ($encoding->status === 'failed') {
                $this->error("Error: {$encoding->error_message}");
            }
        }

        $this->newLine();
        $this->info('Done!');

        return 0;
    }
}
