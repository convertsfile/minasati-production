<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class TestB2Disposition extends Command
{
    protected $signature = 'b2:test-disposition';

    protected $description = 'Test if b2ContentDisposition breaks the URL';

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

        $apiUrl = $auth['apiUrl'];
        $downloadUrl = $auth['downloadUrl'];
        $masterToken = $auth['authorizationToken'];

        // Get download auth token
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $apiUrl.'/b2api/v2/b2_get_download_authorization');
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
        $dlAuth = json_decode($response, true);
        $dlToken = $dlAuth['authorizationToken'];

        $baseUrl = $downloadUrl.'/file/'.rawurlencode($bucketName).'/videos/student_3/lecture_6.mp4';

        // Test 1: No disposition
        $url1 = $baseUrl.'?Authorization='.rawurlencode($dlToken);
        $this->testUrl($url1, 'Without disposition');

        // Test 2: With disposition
        $url2 = $baseUrl.'?Authorization='.rawurlencode($dlToken).'&b2ContentDisposition='.rawurlencode('attachment; filename="lecture_6.mp4"');
        $this->testUrl($url2, 'With disposition');

        // Test 3: With just filename disposition
        $url3 = $baseUrl.'?Authorization='.rawurlencode($dlToken).'&b2ContentDisposition='.rawurlencode('filename="lecture_6.mp4"');
        $this->testUrl($url3, 'With inline disposition');

        // Test 4: With responseContentDisposition
        $url4 = $baseUrl.'?Authorization='.rawurlencode($dlToken).'&responseContentDisposition='.rawurlencode('inline');
        $this->testUrl($url4, 'With responseContentDisposition=inline');

        return 0;
    }

    private function testUrl(string $url, string $label): void
    {
        $this->info("{$label}: {$url}");
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);
        $this->info("  Result: HTTP {$code}, Content-Type: ".($type ?: 'N/A'));
        if ($code !== 200) {
            $this->info("  Body: {$body}");
        }
        $this->newLine();
    }
}
