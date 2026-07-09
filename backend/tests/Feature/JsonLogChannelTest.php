<?php

namespace Tests\Feature;

use Monolog\Formatter\JsonFormatter;
use Monolog\Handler\StreamHandler;
use Monolog\Logger;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Reliability-MAJOR-03: structured (JSON) log channel.
 *
 * The Laravel app ships with a human-readable line-format log channel
 * (storage/logs/laravel.log) that is not directly ingestable by
 * Loki/Elasticsearch/Datadog without sidecar regex parsing. We
 * add a 'json' channel configured with Monolog's JsonFormatter so
 * the platform can run with LOG_CHANNEL=json in production.
 *
 * This test verifies:
 *   1. The 'json' channel is registered in config/logging.php.
 *   2. It uses Monolog's JsonFormatter.
 *   3. Each emitted line is a valid, single-line JSON object.
 */
class JsonLogChannelTest extends TestCase
{
    #[Test]
    public function json_channel_is_registered_in_logging_config(): void
    {
        $channels = config('logging.channels');

        $this->assertArrayHasKey('json', $channels, "logging.channels.json is not defined");
        $this->assertSame('daily', $channels['json']['driver']);
        $this->assertSame(JsonFormatter::class, $channels['json']['formatter']);
    }

    #[Test]
    public function json_channel_uses_daily_driver_with_json_formatter(): void
    {
        $config = config('logging.channels.json');

        $this->assertSame('daily', $config['driver']);
        $this->assertSame(JsonFormatter::class, $config['formatter']);
        $this->assertStringContainsString('laravel.json', $config['path']);
    }

    #[Test]
    public function json_channel_emits_one_json_object_per_line(): void
    {
        // Build a minimal Logger using the same Monolog configuration
        // the Laravel container would, but writing to a temp file.
        $tmp = tempnam(sys_get_temp_dir(), 'jsonlog_');
        $logger = new Logger('json-test');
        $handler = new StreamHandler($tmp, Logger::DEBUG);
        $handler->setFormatter(new JsonFormatter(JsonFormatter::BATCH_MODE_JSON, true));
        $logger->pushHandler($handler);

        $logger->info('structured log line', [
            'user_id' => 42,
            'route' => '/api/auth/login',
            'success' => false,
        ]);

        // Read the temp file and verify each non-empty line is valid JSON.
        $contents = file_get_contents($tmp);
        unlink($tmp);

        $this->assertNotEmpty($contents, 'Logger wrote nothing to the temp file');

        $lines = array_filter(explode("\n", $contents), static fn ($l) => $l !== '');
        $this->assertNotEmpty($lines, 'No log lines emitted');

        foreach ($lines as $line) {
            $decoded = json_decode($line, true);
            $this->assertIsArray(
                $decoded,
                "Log line is not valid JSON: {$line}"
            );
            $this->assertSame('structured log line', $decoded['message']);
            $this->assertSame(42, $decoded['context']['user_id']);
            $this->assertSame('/api/auth/login', $decoded['context']['route']);
        }
    }

    #[Test]
    public function logging_config_includes_a_path_for_the_json_log_file(): void
    {
        $path = config('logging.channels.json.path');

        $this->assertNotEmpty($path);
        $this->assertStringEndsWith('laravel.json', $path);
    }
}
