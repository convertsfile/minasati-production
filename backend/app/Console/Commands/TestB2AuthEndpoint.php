<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class TestB2AuthEndpoint extends Command
{
    protected $signature = 'b2:test-auth-endpoint';

    protected $description = 'Test b2_get_download_authorization directly';

    public function handle(): int
    {
        $keyId = config('services.backblaze.key_id');
        $appKey = config('services.backblaze.application_key');
        $bucketId = config('services.backblaze.bucket');
        $credentials = base64_encode("{$keyId}:{$appKey}");

        // Step 1: Authenticate
        $this->info('Step 1: Authenticating...');
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
        curl_setopt($ch, CURLOPT_HEADER, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        curl_close($ch);

        $body = json_decode(substr($response, $headerSize), true);
        $this->info("Auth HTTP: {$httpCode}");
        $this->info('API URL: '.($body['apiUrl'] ?? 'N/A'));
        $this->info('Download URL: '.($body['downloadUrl'] ?? 'N/A'));
        $this->info('Account ID: '.($body['accountId'] ?? 'N/A'));
        $this->info('Allowed Bucket ID: '.($body['allowed']['bucketId'] ?? 'NULL'));
        $this->newLine();

        $authToken = $body['authorizationToken'] ?? null;
        $apiUrl = $body['apiUrl'] ?? null;

        if (! $authToken) {
            $this->error('Auth failed');

            return 1;
        }

        // Step 2: Test b2_get_download_authorization
        $this->info('Step 2: Testing b2_get_download_authorization...');
        $this->info("Using bucketId: {$bucketId}");

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $apiUrl.'/b2api/v2/b2_get_download_authorization');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: '.$authToken,
            'Content-Type: application/json',
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'bucketId' => $bucketId,
            'fileNamePrefix' => '',
            'validDurationSeconds' => 3600,
        ]));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_HEADER, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        curl_close($ch);

        $headers = substr($response, 0, $headerSize);
        $bodyStr = substr($response, $headerSize);
        $body = json_decode($bodyStr, true);

        $this->info("HTTP Code: {$httpCode}");
        $this->info("Response body: {$bodyStr}");

        if ($httpCode === 200 && isset($body['authorizationToken'])) {
            $this->info('SUCCESS! Got auth token for downloads');
            $this->info('Download URL base: '.($body['downloadUrl'] ?? 'N/A'));
            $this->info('Valid for: '.($body['validDurationSeconds'] ?? 'N/A').' seconds');
        } else {
            $this->error('FAILED: '.($body['message'] ?? $bodyStr));
        }

        return 0;
    }
}
