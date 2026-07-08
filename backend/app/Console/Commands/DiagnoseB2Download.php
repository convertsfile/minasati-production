<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class DiagnoseB2Download extends Command
{
    protected $signature = 'b2:diagnose {key}';

    protected $description = 'Diagnose B2 download issue';

    public function handle(): int
    {
        $key = $this->argument('key');

        $keyId = config('services.backblaze.key_id');
        $appKey = config('services.backblaze.application_key');
        $bucketName = config('services.backblaze.bucket_name', 'minassati');

        // Authenticate
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
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            $this->error("Auth failed: HTTP {$httpCode}");

            return 1;
        }

        $authData = json_decode($response, true);
        $authToken = $authData['authorizationToken'];
        $apiUrl = $authData['apiUrl'];
        $downloadUrl = $authData['downloadUrl'] ?? $apiUrl;

        $this->info('Auth OK!');
        $this->info("API URL: {$apiUrl}");
        $this->info("Download URL: {$downloadUrl}");
        $this->newLine();

        // Try download using b2_download_file_by_name
        $this->info('Trying b2_download_file_by_name...');
        $url = $apiUrl.'/b2api/v2/b2_download_file_by_name?bucketName='.rawurlencode($bucketName).'&fileName='.$key;

        $this->info("URL: {$url}");

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: '.$authToken]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_HEADER, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        curl_close($ch);

        $headers = substr($response, 0, $headerSize);
        $body = substr($response, $headerSize);

        $this->info("HTTP Code: {$httpCode}");
        $this->info('Curl Error: '.($curlError ?: 'None'));
        $this->newLine();
        $this->info('Headers:');
        $this->line($headers);
        $this->newLine();
        $this->info('Body (first 500 chars):');
        $this->line(substr($body, 0, 500));

        // Try using the downloadUrl from auth directly
        $this->newLine();
        $this->info('Trying direct download URL...');
        $directUrl = $downloadUrl.'/file/'.rawurlencode($bucketName).'/'.$key;
        $this->info("URL: {$directUrl}");

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $directUrl);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: '.$authToken]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_HEADER, true);

        $response2 = curl_exec($ch);
        $httpCode2 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError2 = curl_error($ch);
        curl_close($ch);

        $this->info("HTTP Code: {$httpCode2}");
        $this->info('Curl Error: '.($curlError2 ?: 'None'));

        return 0;
    }
}
