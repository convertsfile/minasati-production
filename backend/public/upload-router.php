<?php

// Set PHP settings for video uploads
ini_set('memory_limit', '2048M');
ini_set('upload_max_filesize', '1500M');
ini_set('post_max_size', '1500M');
ini_set('max_execution_time', '600');
ini_set('max_input_time', '600');

// Route to Laravel
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

if ($uri !== '/' && file_exists(__DIR__.$uri)) {
    return false;
}

require __DIR__.'/index.php';
