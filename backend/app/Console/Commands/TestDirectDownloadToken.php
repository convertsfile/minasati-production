<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class TestDirectDownloadToken extends Command
{
    protected $signature = 'b2:test-direct-token';

    protected $description = 'Test direct download with master auth token';

    public function handle(): int
    {
        $keyId = config('services.backblaze.key_id');
        $appKey = config('services.backblaze.application_key');
        $bucketName = config('services.backblaze.bucket_name', 'minassati');
        $credentials = base64_encode("{$keyId}:{$appKey}");

        // Auth
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
        $auth = json_decode($response, true);

        $masterToken = $auth['authorizationToken'];
        $downloadUrl = $auth['downloadUrl'];
        $this->info('Master token: '.substr($masterToken, 0, 30).'...');
        $this->info("Download URL: {$downloadUrl}");
        $this->newLine();

        // Test 1: Master token with friendly URL
        $url1 = $downloadUrl.'/file/'.rawurlencode($bucketName).'/videos/student_3/lecture_6.mp4?Authorization='.rawurlencode($masterToken);
        $this->info('Test 1: Master token + friendly URL');
        $this->info("URL: {$url1}");
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url1);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);
        $this->info("Result: HTTP {$code}, Content-Type: ".($type ?: 'N/A'));
        $this->newLine();

        // Test 2: Master token with API endpoint
        $url2 = $auth['apiUrl'].'/b2api/v2/b2_download_file_by_name?bucketName='.rawurlencode($bucketName).'&fileName=videos/student_3/lecture_6.mp4';
        $this->info('Test 2: Master token + API endpoint');
        $this->info("URL: {$url2}");
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url2);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: '.$masterToken]);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);
        $this->info("Result: HTTP {$code}, Content-Type: ".($type ?: 'N/A'));
        $this->newLine();

        // Test 3: b2_get_download_authorization token with friendly URL
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $auth['apiUrl'].'/b2api/v2/b2_get_download_authorization');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: '.$masterToken,
            'Content-Type: application/json',
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'bucketId' => config('services.backblaze.bucket'),
            'fileNamePrefix' => '',
            'validDurationInSeconds' => 3600,
        ]));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $response = curl_exec($ch);
        curl_close($ch);
        $authData = json_decode($response, true);
        $this->info('Test 3: Download auth token');
        $this->info('b2_get_download_authorization response: '.json_encode($authData));

        if (isset($authData['authorizationToken'])) {
            $dlToken = $authData['authorizationToken'];
            $url3 = $downloadUrl.'/file/'.rawurlencode($bucketName).'/videos/student_3/lecture_6.mp4?Authorization='.rawurlencode($dlToken);
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url3);
            curl_setopt($ch, CURLOPT_NOBODY, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_exec($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
            curl_close($ch);
            $this->info("Result: HTTP {$code}, Content-Type: ".($type ?: 'N/A'));
        }

        return 0;
    }
}
