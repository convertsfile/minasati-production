<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class CheckB2Auth extends Command
{
    protected $signature = 'b2:check-auth';

    protected $description = 'Check B2 auth response and permissions';

    public function handle(): int
    {
        $keyId = config('services.backblaze.key_id');
        $appKey = config('services.backblaze.application_key');
        $credentials = base64_encode("{$keyId}:{$appKey}");

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://api.backblazeb2.com/b2api/v2/b2_authorize_account');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Basic {$credentials}",
            'Content-Type: application/json',
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, '{}');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $response = curl_exec($ch);
        curl_close($ch);

        $data = json_decode($response, true);

        $this->info('Auth Response:');
        $this->newLine();
        $this->line('Account ID: '.($data['accountId'] ?? 'N/A'));
        $this->line('API URL: '.($data['apiUrl'] ?? 'N/A'));
        $this->line('Download URL: '.($data['downloadUrl'] ?? 'N/A'));
        $this->newLine();

        $this->info('Allowed:');
        $allowed = $data['allowed'] ?? [];
        $this->line('Bucket ID: '.($allowed['bucketId'] ?? 'NULL (master key or no bucket restriction)'));
        $this->line('Bucket Name: '.($allowed['bucketName'] ?? 'N/A'));
        $this->line('Capabilities: '.implode(', ', $allowed['capabilities'] ?? []));
        $this->newLine();

        // If we have a bucket ID, try to list files
        if (! empty($allowed['bucketId'])) {
            $this->info('Listing files in bucket...');

            $listUrl = $data['apiUrl'].'/b2api/v2/b2_list_file_names';
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $listUrl);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: '.$data['authorizationToken'],
                'Content-Type: application/json',
            ]);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
                'bucketId' => $allowed['bucketId'],
                'maxFileCount' => 10,
            ]));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

            $listResponse = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200) {
                $listData = json_decode($listResponse, true);
                $files = $listData['files'] ?? [];
                $this->info('Found '.count($files).' file(s)');
                foreach ($files as $file) {
                    $this->line("  - {$file['fileName']}");
                }
            } else {
                $this->error("List failed: HTTP {$httpCode}");
                $this->line($listResponse);
            }
        } else {
            $this->warn('No bucket ID in auth response - cannot list files');
            $this->info('You may need to use a bucket-specific application key');
        }

        return 0;
    }
}
