<?php

namespace Tests\Feature\Video;

use App\Models\Course;
use App\Models\Lecture;
use App\Models\Setting;
use App\Models\User;
use App\Services\InternalJwtService;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Tests\TestCase;

/**
 * ملاحظة (وفق AGENTS.md):
 * - التواصل بين Laravel ومحرك Go يستخدم JWT (Authorization: Bearer ...)
 *   وليس نصّاً مُقارَناً مع X-Internal-Secret. (انظر InternalJwtService)
 * - رسالة حدّ التخزين الفعلية هي:
 *   "لقد بلغت الحد الأقصى للمساحة المسموحة لباقة الاشتراك."
 */
class VideoEngineTest extends TestCase
{
    use DatabaseTruncation;

    public function test_get_secure_playlist_rewrites_variant_paths_with_subdirectories()
    {
        // 1. Setup Models
        $user = User::factory()->active()->create();
        $course = Course::create(['title' => 'Physics 101', 'price_points' => 200]);

        // Enroll student in the course
        $course->students()->attach($user->id, ['access_type' => 'purchase']);

        $lecture = Lecture::create([
            'course_id' => $course->id,
            'title' => 'Lecture 1',
            'video_status' => 'completed',
            'm3u8_path' => 'streams/lecture_999/master.m3u8',
        ]);

        // 2. Mock B2 client generically to handle both index.m3u8 and segment.ts files
        $mockDisk = Mockery::mock(Filesystem::class);
        $mockClient = Mockery::mock();
        $mockCmd = Mockery::mock();
        $mockRequest = Mockery::mock();

        $mockClient->shouldReceive('getCommand')
            ->andReturn($mockCmd);

        $mockClient->shouldReceive('createPresignedRequest')
            ->andReturn($mockRequest);

        $mockRequest->shouldReceive('getUri')
            ->andReturn('http://mock-b2-url.com/streams/lecture_999/v0/segment_000.ts');

        $mockDisk->shouldReceive('getClient')
            ->andReturn($mockClient);

        Storage::shouldReceive('disk')
            ->with('b2')
            ->andReturn($mockDisk);

        // 3. Mock HTTP call to get the sub-playlist file from B2
        $subPlaylistContent = "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-KEY:METHOD=AES-128,URI=\"http://localhost/api/video/key/123\",IV=0x123\nsegment_000.ts\nsegment_001.ts";
        Http::fake([
            'http://mock-b2-url.com/*' => Http::response($subPlaylistContent, 200),
        ]);

        // 4. Authenticate as the student and set active session id
        $sessionId = 'test-session-123';
        Cache::put("playback_session_{$user->id}_{$lecture->id}", $sessionId, 10);
        Sanctum::actingAs($user);

        // 5. Call getSecurePlaylist for variant v0/index.m3u8
        $response = $this->get('/api/video/secure-playlist/'.$lecture->id.'?variant='.urlencode('v0/index.m3u8').'&session_id='.$sessionId);

        $response->assertStatus(200);

        // Verify that the segment paths in the response are converted to the pre-signed B2 URL
        $content = $response->getContent();
        $this->assertStringContainsString('http://mock-b2-url.com/streams/lecture_999/v0/segment_000.ts', $content);
    }

    public function test_start_processing_sends_jwt_authorization_to_go_worker()
    {
        // 1. Setup Models
        $admin = User::factory()->create(['role' => 'admin']);
        $course = Course::create(['title' => 'Physics 101', 'price_points' => 200]);
        $lecture = Lecture::create([
            'course_id' => $course->id,
            'title' => 'Lecture Test',
            'video_status' => 'pending',
            'raw_key' => 'lectures/1/raw_video.mp4',
        ]);

        // 2. Set current plan to startup (limit: 480p only) and mock go url config
        Setting::setValue('platform_plan', 'startup');
        config(['services.video.go_url' => 'http://127.0.0.1:8080']);

        // 3. Fake HTTP request to Go worker
        Http::fake([
            'http://127.0.0.1:8080/*' => Http::response(['status' => 'success'], 200),
        ]);

        // 4. Authenticate as Admin
        Sanctum::actingAs($admin);

        // 5. Call startProcessing
        $response = $this->postJson("/api/admin/lectures/{$lecture->id}/start-processing");

        // 6. Verify request payload contained 'qualities' => ['480p'] AND JWT auth header
        Http::assertSent(function ($request) {
            $hasQualities = ($request['qualities'] ?? null) === ['480p'];
            // 🚀 MAJOR FIX: $request->header() يُرجع مصفوفة، نحتاج [0] ?? '' لتفادي
            // "Array to string conversion" warning
            $authHeader = $request->header('Authorization');
            $authValue = is_array($authHeader) ? ($authHeader[0] ?? '') : (string) $authHeader;
            $hasJwt = str_starts_with($authValue, 'Bearer ');
            return $request->url() == 'http://127.0.0.1:8080/api/v1/video/process'
                && $hasQualities
                && $hasJwt;
        });

        $response->assertStatus(200);
    }

    public function test_internal_jwt_service_round_trip()
    {
        // عقد الإصدار والتحقق يجب أن يعمل (دخان للـ InternalJwtService)
        $token = InternalJwtService::issue('123', 'video.encoded', 60);
        $this->assertNotEmpty($token);

        $claims = InternalJwtService::verify($token, 'video.encoded', 120);
        $this->assertEquals('laravel', $claims['iss']);
        $this->assertEquals('vod-engine', $claims['aud']);
        $this->assertEquals('123', $claims['sub']);
        $this->assertEquals('video.encoded', $claims['event']);
        $this->assertEquals('v1', $claims['kid']);
    }

    public function test_internal_jwt_rejects_wrong_event()
    {
        $token = InternalJwtService::issue('123', 'video.encoded', 60);
        $this->expectException(\Throwable::class);
        InternalJwtService::verify($token, 'video.process', 120);
    }

    public function test_get_upload_token_fails_when_storage_limit_reached()
    {
        $course = Course::create(['title' => 'Physics 101', 'price_points' => 200]);
        $lecture = Lecture::create([
            'course_id' => $course->id,
            'title' => 'Lecture Test',
            'video_status' => 'pending',
        ]);

        // 1. Set current plan to startup (limit: 30 GB = 32212254720 bytes)
        Setting::setValue('platform_plan', 'startup');

        // 2. Create lectures that consume 31 GB
        Lecture::create([
            'course_id' => $course->id,
            'title' => 'Large Lecture',
            'size_bytes' => 31 * 1024 * 1024 * 1024,
            'video_status' => 'completed',
        ]);

        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        // 3. Request upload token
        $response = $this->getJson("/api/admin/lectures/{$lecture->id}/upload-ticket");

        // 4. Verify 403 response — الكود الفعلي يصدر 'ERR_STORAGE_LIMIT' ورسالة كاملة.
        $response->assertStatus(403)
            ->assertJsonPath('code', 'ERR_STORAGE_LIMIT');
        $this->assertStringContainsString(
            'لقد بلغت الحد الأقصى للمساحة',
            (string) $response->json('message', '')
        );
    }

    public function test_admin_limits_endpoint_returns_correct_data()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        Setting::setValue('platform_plan', 'startup');

        // Create 120 students (80% of 150)
        User::factory()->count(120)->create(['role' => 'student']);

        $response = $this->getJson('/api/admin/limits');

        $response->assertStatus(200)
            ->assertJsonPath('data.plan', 'startup')
            ->assertJsonPath('data.students.current', 120)
            ->assertJsonPath('data.students.max', 150)
            ->assertJsonPath('data.students.percentage', 80)
            ->assertJsonPath('data.warning', true);
    }

    public function test_cancel_upload_deletes_raw_key_from_b2_and_resets_database()
    {
        Storage::fake('b2');

        $admin = User::factory()->create(['role' => 'admin']);
        $course = Course::create(['title' => 'Physics 101', 'price_points' => 200]);
        $lecture = Lecture::create([
            'course_id' => $course->id,
            'title' => 'Lecture Test',
            'video_status' => 'uploading',
            'raw_key' => 'lectures/1/raw_video.mp4',
            'size_bytes' => 100000,
        ]);

        Storage::disk('b2')->put('lectures/1/raw_video.mp4', 'dummy video content');

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/admin/lectures/{$lecture->id}/cancel-upload");

        $response->assertStatus(200);

        // Verify file was deleted from fake disk
        Storage::disk('b2')->assertMissing('lectures/1/raw_video.mp4');

        // Verify DB updates
        $lecture->refresh();
        $this->assertEquals('pending', $lecture->video_status);
        $this->assertNull($lecture->raw_key);
        $this->assertEquals(0, $lecture->size_bytes);
    }

    public function test_delete_video_deletes_b2_files_and_resets_size_bytes()
    {
        Storage::fake('b2');

        // Mock Go URL config
        config(['services.video.go_url' => 'http://127.0.0.1:8080']);
        Http::fake([
            'http://127.0.0.1:8080/*' => Http::response(['status' => 'success'], 200),
        ]);

        $admin = User::factory()->create(['role' => 'admin']);
        $course = Course::create(['title' => 'Physics 101', 'price_points' => 200]);
        $lecture = Lecture::create([
            'course_id' => $course->id,
            'title' => 'Lecture Test',
            'video_status' => 'completed',
            'm3u8_path' => 'streams/lecture_1/master.m3u8',
            'raw_key' => 'lectures/1/raw_video.mp4',
            'size_bytes' => 123456,
        ]);

        Storage::disk('b2')->put('lectures/1/raw_video.mp4', 'dummy raw video content');
        // 🚀 ملاحظة: لا نضع m3u8 على الـ disk لأن destroyVideo يفوّض حذفه لمحرك Go
        // (وليس لـ Storage::disk('b2')) - لذلك سنتأكد من إرسال طلب DELETE لمحرك Go

        Sanctum::actingAs($admin);

        $response = $this->deleteJson("/api/admin/lectures/{$lecture->id}/video");

        $response->assertStatus(200);

        // Verify raw_key was deleted from B2 (Laravel-side)
        Storage::disk('b2')->assertMissing('lectures/1/raw_video.mp4');

        // 🚀 MAJOR FIX: التأكد أن destroyVideo أرسل DELETE لمحرك Go لحذف ملفات m3u8/segments
        Http::assertSent(function ($request) use ($lecture) {
            $authHeader = $request->header('Authorization');
            $authValue = is_array($authHeader) ? ($authHeader[0] ?? '') : (string) $authHeader;
            return $request->method() === 'DELETE'
                && $request->url() === 'http://127.0.0.1:8080/api/v1/video/' . $lecture->id
                && str_starts_with($authValue, 'Bearer ');
        });

        // Verify DB updates
        $lecture->refresh();
        $this->assertEquals('pending', $lecture->video_status);
        $this->assertNull($lecture->raw_key);
        $this->assertEquals(0, $lecture->size_bytes);
    }
}
