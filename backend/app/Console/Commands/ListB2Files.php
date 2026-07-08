<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ListB2Files extends Command
{
    protected $signature = 'b2:list {prefix?}';

    protected $description = 'List files in B2 bucket';

    public function handle(): int
    {
        $prefix = $this->argument('prefix') ?? '';
        $bucketName = config('services.backblaze.bucket_name', 'minassati');

        // Authenticate
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

        $authData = json_decode($response, true);
        $authToken = $authData['authorizationToken'];
        $apiUrl = $authData['apiUrl'];
        $accountId = $authData['accountId'];

        // Get bucket ID (needed for master keys without bucket restriction)
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $apiUrl.'/b2api/v2/b2_list_buckets');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: '.$authToken,
            'Content-Type: application/json',
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['accountId' => $accountId]));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $response = curl_exec($ch);
        curl_close($ch);

        $bucketsData = json_decode($response, true);
        $bucketId = null;
        foreach ($bucketsData['buckets'] ?? [] as $bucket) {
            if ($bucket['bucketName'] === $bucketName) {
                $bucketId = $bucket['bucketId'];
                break;
            }
        }

        if (! $bucketId) {
            $this->error("Bucket '{$bucketName}' not found");

            return 1;
        }

        $this->info("Bucket ID: {$bucketId}");
        $this->newLine();

        // List files
        $listUrl = $apiUrl.'/b2api/v2/b2_list_file_names';
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $listUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: '.$authToken,
            'Content-Type: application/json',
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'bucketId' => $bucketId,
            'prefix' => $prefix,
            'maxFileCount' => 100,
        ]));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            $this->error("List failed: HTTP {$httpCode}");
            $this->line($response);

            return 1;
        }

        $data = json_decode($response, true);
        $files = $data['files'] ?? [];

        $this->info('Found '.count($files).' file(s)');
        $this->newLine();

        foreach ($files as $file) {
            $this->line("- {$file['fileName']} ({$file['contentLength']} bytes)");
        }

        return 0;
    }
}
