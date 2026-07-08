<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'cloudinary' => [
        'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
        'api_key' => env('CLOUDINARY_API_KEY'),
        'api_secret' => env('CLOUDINARY_API_SECRET'),
    ],

    'backblaze' => [
        'key_id' => env('B2_KEY_ID'),
        'application_key' => env('B2_APP_KEY'),
        'bucket' => env('B2_BUCKET_ID'),
        'bucket_public' => env('B2_BUCKET_ID_PUBLIC'),
        'bucket_name' => env('B2_BUCKET_NAME'),
        'bucket_name_public' => env('B2_BUCKET_NAME_PUBLIC'),
        'region' => env('B2_REGION', 'us-east-005'),
        'endpoint' => env('B2_ENDPOINT'),
        'cdn_domain' => env('B2_CDN_DOMAIN'),
    ],

    'twilio' => [
        'account_sid' => env('TWILIO_ACCOUNT_SID'),
        'auth_token' => env('TWILIO_AUTH_TOKEN'),
        'phone_number' => env('TWILIO_PHONE_NUMBER'),
    ],

    'fawry' => [
        'merchant_code' => env('FAWRY_MERCHANT_CODE'),
        'api_key' => env('FAWRY_API_KEY'),
        'secret_key' => env('FAWRY_SECRET_KEY'),
    ],

    'vodafone_cash' => [
        'merchant_code' => env('VODAFONE_CASH_MERCHANT_CODE'),
        'api_key' => env('VODAFONE_CASH_API_KEY'),
        'secret_key' => env('VODAFONE_CASH_SECRET_KEY'),
    ],

    'video' => [
        'jwt_secret' => env('JWT_SECRET'),
        'go_url' => env('GO_ENGINE_URL'),
    ],

    'b2' => [
        'cdn_url' => env('B2_CDN_URL'),
    ],

];
