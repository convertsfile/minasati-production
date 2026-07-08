<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class TestB2BucketList extends Command
{
    protected $signature = 'b2:test-bucket-list';

    protected $description = 'Test B2 list_buckets';

    public function handle(): int
    {
        $keyId = config('services.backblaze.key_id');
        $appKey = config('services.backblaze.application_key');
        $credentials = base64_encode("{$keyId}:{$appKey}");

        // Auth first
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

        $this->info("Account ID: {$accountId}");
        $this->info("API URL: {$apiUrl}");
        $this->newLine();

        // Try list_buckets with accountId
        $this->info('Trying list_buckets with accountId...');
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $apiUrl.'/b2api/v2/b2_list_buckets');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: '.$authToken,
            'Content-Type: application/json',
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'accountId' => $accountId,
        ]));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $this->info("HTTP Code: {$httpCode}");
        $this->line($response);

        return 0;
    }
}
