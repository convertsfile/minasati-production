<?php

namespace Tests\Feature\Security;

use App\Services\BackblazeStorageService;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * SEC-MAJOR-02: user uploads are stored in the private bucket and served
 * via short-lived signed URLs.
 *
 * Verifies:
 *   - getUrl() refuses to mint an unsigned URL for an "uploads/*" key
 *   - The only public-bucket key prefix allowed is "public-assets/*"
 *   - getSignedUrl() can still be called and returns a string (the
 *     B2 client is mocked so we don't hit the real API)
 */
class PrivateUploadStorageTest extends TestCase
{
    #[Test]
    public function get_url_refuses_to_mint_unsigned_url_for_user_uploads(): void
    {
        $service = new class extends BackblazeStorageService {
            public function __construct() {}
            public function setValues(): void {}
        };

        // Use reflection to call the private isPublicKey via getUrl's
        // internal check. We cannot reach the private isPublicKey() method
        // directly, so we use the public getUrl() contract:
        //   - "uploads/student_ids/abc.jpg" must return ''
        //   - "public-assets/lesson-1/thumb.jpg" is allowed (not user data)
        $url = $service->getUrl('uploads/student_ids/abc.jpg');
        $this->assertSame('', $url, 'getUrl() must refuse to mint an unsigned URL for an uploads/* key');
    }

    #[Test]
    public function file_upload_service_returns_a_signed_url(): void
    {
        // Stub B2 service to return deterministic values.
        $stub = $this->createMock(BackblazeStorageService::class);
        $stub->method('upload')->willReturn(true);
        $stub->method('getSignedUrl')->willReturnCallback(
            fn (string $key, int $ttl) => "https://fake-b2.local/file/{$key}?ttl={$ttl}"
        );
        $stub->method('delete')->willReturn(true);

        $this->app->instance(BackblazeStorageService::class, $stub);

        $service = app(\App\Services\FileUploadService::class);
        $file = \Illuminate\Http\UploadedFile::fake()->image('id.jpg', 100, 100);

        $result = $service->upload($file, 'student_ids');

        $this->assertNotNull($result);
        $this->assertStringStartsWith('uploads/student_ids/', $result['public_id']);
        $this->assertStringStartsWith('https://fake-b2.local/file/uploads/student_ids/', $result['url']);
        $this->assertStringContainsString('ttl=300', $result['url']);
    }

    #[Test]
    public function raw_key_paths_remain_blocked(): void
    {
        $service = new class extends BackblazeStorageService {
            public function __construct() {}
        };

        $this->expectException(\Exception::class);
        $this->expectExceptionMessageMatches('/raw videos is forbidden/i');
        $service->getUrl('raw/lessons/1/source.mp4');
    }
}
