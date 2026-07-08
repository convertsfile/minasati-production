<?php

namespace App\Console\Commands;

use App\Models\StudentVideoEncoding;
use App\Models\User;
use App\Services\BackblazeStorageService;
use Illuminate\Console\Command;

class VerifyEncodedVideo extends Command
{
    protected $signature = 'encoding:verify {email}';

    protected $description = 'Download and verify encoded video';

    public function handle(BackblazeStorageService $b2Service): int
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();

        if (! $user) {
            $this->error('User not found');

            return 1;
        }

        $encoding = StudentVideoEncoding::where('user_id', $user->id)
            ->where('lecture_id', 1)
            ->first();

        if (! $encoding || ! $encoding->b2_video_path) {
            $this->error('No encoded video found');

            return 1;
        }

        $this->info("B2 Path: {$encoding->b2_video_path}");

        $localPath = storage_path('app/temp_verify_'.time().'.mp4');
        $this->info("Downloading to: {$localPath}");

        $result = $b2Service->downloadFile($encoding->b2_video_path, $localPath);
        if (! $result) {
            $this->error('Download failed');

            return 1;
        }

        $size = filesize($localPath);
        $this->info("Downloaded: {$size} bytes");

        // Check with ffprobe
        $cmd = 'ffprobe -v quiet -print_format json -show_streams '.escapeshellarg($localPath).' 2>&1';
        exec($cmd, $output, $code);
        $info = json_decode(implode('', $output), true);

        if ($info && isset($info['streams'])) {
            foreach ($info['streams'] as $stream) {
                $dims = isset($stream['width']) ? " - {$stream['width']}x{$stream['height']}" : '';
                $this->info("Stream: {$stream['codec_type']} - {$stream['codec_name']}{$dims}");
            }
        } else {
            $this->warn('Could not parse video info');
            $this->line(implode("\n", $output));
        }

        @unlink($localPath);

        return 0;
    }
}
