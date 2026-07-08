<?php

namespace App\Console\Commands;

use App\Models\StudentVideoEncoding;
use App\Services\BackblazeStorageService;
use Illuminate\Console\Command;

class FixMissingRawVideos extends Command
{
    protected $signature = 'encoding:fix-missing';

    protected $description = 'Delete encodings for lectures with missing raw videos in B2';

    public function handle(BackblazeStorageService $b2Service): int
    {
        $encodings = StudentVideoEncoding::where('status', 'failed')->get();
        $fixed = 0;

        foreach ($encodings as $encoding) {
            $lecture = $encoding->lecture;
            if (! $lecture || ! $lecture->b2_video_path) {
                $this->info("Deleting encoding {$encoding->id} - lecture has no raw video");
                $encoding->delete();
                $fixed++;

                continue;
            }

            // Try to check if file exists in B2
            $tempPath = storage_path('app/temp_check_'.time().'.tmp');
            $exists = $b2Service->downloadFile($lecture->b2_video_path, $tempPath);
            if ($exists) {
                @unlink($tempPath);
                $this->info("Encoding {$encoding->id} - raw video exists, should work on retry");
            } else {
                $this->warn("Encoding {$encoding->id} - raw video missing in B2: {$lecture->b2_video_path}");
                $encoding->delete();
                $fixed++;
            }
        }

        $this->info("Fixed {$fixed} encoding(s)");

        return 0;
    }
}
