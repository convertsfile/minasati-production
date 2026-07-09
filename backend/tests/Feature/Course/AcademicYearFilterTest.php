<?php

namespace Tests\Feature\Course;

use App\Models\Course;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * يضمن هذا الملف أن MAJOR #M3 (إسقاط فلتر السنة الدراسية في
 * GET /api/courses) تم إصلاحه، وأن الكورسات المعروضة للطالب
 * تقتصر على صفه الدراسي + "other".
 */
class AcademicYearFilterTest extends TestCase
{
    use DatabaseTruncation;

    public function test_logged_in_student_only_sees_courses_for_their_academic_year_or_other()
    {
        // الطالب في الصف الثاني الإعدادي
        $student = User::factory()->active()->create(['academic_year' => '2']);
        Sanctum::actingAs($student);

        // كورسات لصفوف مختلفة
        Course::create(['title' => 'G2 Course', 'status' => 'published', 'academic_year' => '2']);
        Course::create(['title' => 'G3 Course', 'status' => 'published', 'academic_year' => '3']);
        Course::create(['title' => 'G1 Course', 'status' => 'published', 'academic_year' => '1']);
        Course::create(['title' => 'Other Course', 'status' => 'published', 'academic_year' => 'other']);

        $response = $this->getJson('/api/courses');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $titles = collect($response->json('data'))->pluck('title')->all();

        // يجب أن يظهر: G2 + other
        $this->assertContains('G2 Course', $titles, 'كورس صف الطالب يجب أن يظهر');
        $this->assertContains('Other Course', $titles, 'كورس other يجب أن يظهر للجميع');
        // يجب ألا يظهر: G1, G3
        $this->assertNotContains('G1 Course', $titles, 'كورس صف مختلف يجب ألا يظهر');
        $this->assertNotContains('G3 Course', $titles, 'كورس صف مختلف يجب ألا يظهر');
    }

    public function test_guest_user_sees_all_courses()
    {
        // لا يوجد تسجيل دخول
        Course::create(['title' => 'A1', 'status' => 'published', 'academic_year' => '1']);
        Course::create(['title' => 'A2', 'status' => 'published', 'academic_year' => '2']);
        Course::create(['title' => 'Aother', 'status' => 'published', 'academic_year' => 'other']);

        $response = $this->getJson('/api/courses');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $titles = collect($response->json('data'))->pluck('title')->all();
        $this->assertCount(3, $titles, 'الزائر يجب أن يرى كل الكورسات المنشورة');
    }
}
