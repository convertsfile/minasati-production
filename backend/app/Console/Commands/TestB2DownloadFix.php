<?php

namespace App\Console\Commands;

use App\Services\BackblazeStorageService;
use Illuminate\Console\Command;

class TestB2DownloadFix extends Command
{
    protected $signature = 'b2:test-download-fix {key}';

    protected $description = 'Test the B2 download fix';

    public function handle(BackblazeStorageService $b2Service): int
    {
        $key = $this->argument('key');
        $localPath = storage_path('app/temp_b2_test_'.time().'.mp4');

        $this->info("Testing download of: {$key}");
        $this->newLine();

        $result = $b2Service->downloadFile($key, $localPath);

        if ($result) {
            $this->info('Download SUCCESS!');
            $this->info("File saved to: {$localPath}");
            $this->info('File size: '.filesize($localPath).' bytes');
            @unlink($localPath);

            return 0;
        } else {
            $this->error('Download FAILED!');
            @unlink($localPath);

            return 1;
        }
    }
}
