<?php

namespace Tests\Feature\Security;

use App\Services\OtpService;
use Kreait\Firebase\Contract\Auth as FirebaseAuth;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * SEC-MAJOR-03: the dev-bypass token in OtpService must only fire in
 * the "local" environment, never based on app()->debug(). A misconfigured
 * production deploy (APP_DEBUG=true) is otherwise an account-takeover
 * vulnerability.
 */
class OtpServiceBypassTest extends TestCase
{
    private function makeOtpService(): OtpService
    {
        $mock = Mockery::mock(FirebaseAuth::class);
        $mock->shouldIgnoreMissing();
        return new OtpService($mock);
    }

    #[Test]
    public function dev_bypass_works_in_local_environment(): void
    {
        $this->app->detectEnvironment(fn () => 'local');

        $service = $this->makeOtpService();
        $result = $service->verifyFirebaseToken('DEV_TEST_TOKEN_123', '+201000000000');

        $this->assertTrue($result['success']);
        $this->assertStringContainsString('وضع التطوير', $result['message']);
    }

    #[Test]
    public function dev_bypass_is_rejected_in_production_even_with_debug_true(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        // Force APP_DEBUG=true to simulate the misconfiguration.
        config(['app.debug' => true]);

        $service = $this->makeOtpService();
        $result = $service->verifyFirebaseToken('DEV_TEST_TOKEN_123', '+201000000000');

        // The Firebase call below will fail (no real credentials), but the
        // key point is that the dev-bypass branch did NOT fire — the
        // returned result is the failure case from the catch block.
        $this->assertFalse($result['success']);
        $this->assertNotSame('تم التحقق بنجاح (وضع التطوير)', $result['message']);
    }

    #[Test]
    public function dev_bypass_is_rejected_in_staging_environment(): void
    {
        $this->app->detectEnvironment(fn () => 'staging');

        $service = $this->makeOtpService();
        $result = $service->verifyFirebaseToken('DEV_TEST_TOKEN_123', '+201000000000');

        $this->assertFalse($result['success']);
    }

    #[Test]
    public function production_rejects_arbitrary_bypass_token_attempts(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        config(['app.debug' => false]);

        $service = $this->makeOtpService();
        $result = $service->verifyFirebaseToken('DEV_TEST_TOKEN_123', null);

        $this->assertFalse($result['success']);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
