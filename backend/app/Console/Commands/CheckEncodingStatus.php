<?php

namespace App\Console\Commands;

use App\Models\StudentVideoEncoding;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CheckEncodingStatus extends Command
{
    protected $signature = 'encoding:status {email?}';

    protected $description = 'Check video encoding status for a user or all users';

    public function handle(): int
    {
        $email = $this->argument('email');

        if ($email) {
            $user = User::where('email', $email)->first();
            if (! $user) {
                $this->error("User not found: {$email}");

                return 1;
            }
            $encodings = StudentVideoEncoding::where('user_id', $user->id)->get();
        } else {
            $encodings = StudentVideoEncoding::all();
        }

        if ($encodings->isEmpty()) {
            $this->warn('No encoding records found.');

            return 0;
        }

        $this->info("Found {$encodings->count()} encoding record(s):");
        $this->newLine();

        $pending = 0;
        $processing = 0;
        $completed = 0;
        $failed = 0;

        foreach ($encodings as $encoding) {
            $lecture = $encoding->lecture;
            $user = $encoding->user;

            $statusColor = match ($encoding->status) {
                'completed' => 'info',
                'failed' => 'error',
                'processing' => 'comment',
                default => 'warn',
            };

            $this->line("User: {$user->email} | Lecture: {$lecture?->title} (ID: {$encoding->lecture_id})");
            $this->line("Status: <{$statusColor}>{$encoding->status}</{$statusColor}> | Created: {$encoding->created_at->diffForHumans()}");

            if ($encoding->status === 'failed') {
                $this->line("Error: <error>{$encoding->error_message}</error>");
            }

            $this->newLine();

            match ($encoding->status) {
                'pending' => $pending++,
                'processing' => $processing++,
                'completed' => $completed++,
                'failed' => $failed++,
                default => null,
            };
        }

        $this->info("Summary: {$pending} pending, {$processing} processing, {$completed} completed, {$failed} failed");

        // Check queue jobs table
        $jobsCount = DB::table('jobs')->count();
        $failedJobsCount = DB::table('failed_jobs')->count();

        $this->newLine();
        $this->info("Queue status: {$jobsCount} pending job(s) in queue, {$failedJobsCount} failed job(s)");

        return 0;
    }
}
