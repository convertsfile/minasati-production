<?php

namespace App\Console\Commands;

use App\Services\BackblazeStorageService;
use Illuminate\Console\Command;

class TestB2Connection extends Command
{
    protected $signature = 'b2:test';

    protected $description = 'Test Backblaze B2 upload and download';

    public function handle(BackblazeStorageService $b2Service): int
    {
        $this->info('Testing Backblaze B2 connection...');
        $this->newLine();

        // Check config
        $keyId = config('services.backblaze.key_id');
        $appKey = config('services.backblaze.application_key');
        $bucket = config('services.backblaze.bucket_name');

        $this->info('Key ID: '.($keyId ? substr($keyId, 0, 5).'...' : 'NOT SET'));
        $this->info('App Key: '.($appKey ? 'SET (hidden)' : 'NOT SET'));
        $this->info("Bucket: {$bucket}");
        $this->newLine();

        // Test authentication
        $this->info('Testing authentication...');
        $reflection = new \ReflectionClass($b2Service);
        $authMethod = $reflection->getMethod('authenticate');
        $authMethod->setAccessible(true);
        $authResult = $authMethod->invoke($b2Service);

        if (! $authResult) {
            $this->error('Authentication FAILED! Check your B2 credentials in .env');

            return 1;
        }
        $this->info('Authentication SUCCESS!');

        // Create a test file
        $testContent = 'Test file content '.time();
        $localPath = storage_path('app/temp_b2_test.txt');
        $downloadPath = storage_path('app/temp_b2_test_download.txt');

        if (! is_dir(dirname($localPath))) {
            mkdir(dirname($localPath), 0755, true);
        }

        file_put_contents($localPath, $testContent);

        // Test upload
        $this->info('Testing upload...');
        $uploadResult = $b2Service->uploadFile($localPath, 'test/upload_test_'.time().'.txt');

        if (! $uploadResult) {
            $this->error('Upload FAILED!');
            @unlink($localPath);

            return 1;
        }
        $this->info('Upload SUCCESS!');

        // Test download
        $this->info('Testing download...');
        $downloadResult = $b2Service->downloadFile('test/upload_test_'.time().'.txt', $downloadPath);

        // Actually test with the file we just uploaded
        $this->info('Testing download of actual uploaded file...');
        $uploadedKey = 'test/upload_test_'.time().'.txt';

        // Re-upload with known key
        $this->info('Uploading with known key...');
        $uploadResult = $b2Service->uploadFile($localPath, 'test/diagnostic.txt');
        if (! $uploadResult) {
            $this->error('Upload with known key FAILED!');
            @unlink($localPath);

            return 1;
        }

        $this->info('Downloading test file...');
        $downloadResult = $b2Service->downloadFile('test/diagnostic.txt', $downloadPath);

        if (! $downloadResult) {
            $this->error('Download FAILED!');
            $this->info('Checking logs for details...');
            @unlink($localPath);

            return 1;
        }

        $this->info('Download SUCCESS!');

        // Verify content
        $downloadedContent = file_get_contents($downloadPath);
        if ($downloadedContent === $testContent) {
            $this->info('Content verified: MATCH!');
        } else {
            $this->warn('Content mismatch!');
        }

        // Cleanup
        @unlink($localPath);
        @unlink($downloadPath);

        $this->newLine();
        $this->info('B2 connection test completed successfully!');

        return 0;
    }
}
