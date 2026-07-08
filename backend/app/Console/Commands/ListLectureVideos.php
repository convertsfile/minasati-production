<?php

namespace App\Console\Commands;

use App\Models\Lecture;
use Illuminate\Console\Command;

class ListLectureVideos extends Command
{
    protected $signature = 'lectures:list-videos';

    protected $description = 'List all lectures with their B2 video paths';

    public function handle(): int
    {
        $lectures = Lecture::whereNotNull('b2_video_path')->get();

        if ($lectures->isEmpty()) {
            $this->warn('No lectures with video paths found.');

            return 0;
        }

        $this->info("Found {$lectures->count()} lecture(s) with videos:");
        $this->newLine();

        foreach ($lectures as $lecture) {
            $this->line("Lecture ID: {$lecture->id}");
            $this->line("Title: {$lecture->title}");
            $this->line("B2 Path: {$lecture->b2_video_path}");
            $this->line("Encoding Status: {$lecture->encoding_status}");
            $this->newLine();
        }

        return 0;
    }
}
