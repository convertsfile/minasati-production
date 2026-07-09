<?php

namespace Tests\Feature\Admin;

use App\Models\Course;
use App\Models\Lecture;
use App\Models\User;
use App\Models\VideoViolation;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * يضمن هذا الملف أن MAJOR #M2 (استعلام N+1 في
 * GET /api/admin/security/students-with-violations) تم إصلاحه.
 *
 * قبل الإصلاح: كان كل طالب في الصفحة يولّد استعلاماً إضافياً
 * (`$user->videoViolations()->whereIn(...)->latest()->first()`).
 * بعد الإصلاح: استعلام مجمَّع واحد فقط لجميع الطلاب في الصفحة.
 */
class StudentsWithViolationsN1Test extends TestCase
{
    use DatabaseTruncation;

    public function test_students_with_violations_does_not_suffer_n_plus_1_query()
    {
        // إعداد: 5 طلاب + كورس + محاضرة، ولكل طالب 3 مخالفات مميتة (لتظهر في القائمة)
        $course = Course::create(['title' => 'Test Course']);
        $lecture = Lecture::create(['course_id' => $course->id, 'title' => 'L1', 'order_index' => 1]);
        $students = User::factory()->active()->count(5)->create();

        foreach ($students as $student) {
            for ($i = 0; $i < 3; $i++) {
                VideoViolation::create([
                    'user_id' => $student->id,
                    'lecture_id' => $lecture->id,
                    'violation_type' => 'devtools',
                ]);
                // تأخير 1 ثانية حتى تختلف created_at
                sleep(1);
            }
        }

        // مسؤول لطلب المسار المحمي
        $admin = User::factory()->active()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        // تفعيل سجل الاستعلامات
        DB::enableQueryLog();
        $response = $this->getJson('/api/admin/security/students-with-violations');
        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        // ضمان ظهور جميع الطلاب
        $responseData = $response->json('data');
        $this->assertCount(5, $responseData, 'يجب أن يظهر جميع الطلاب الذين لديهم 3+ مخالفات مميتة');

        // ضمان أن lastViolation موجود لكل طالب
        foreach ($responseData as $entry) {
            $this->assertNotNull($entry['lastViolation'] ?? null, "lastViolation must be set for user {$entry['id']}");
        }

        // ✅ إصلاح N+1:
        // قبل الإصلاح: 1 (الـ paginator) + 1 (withCount) + N (latest->first لكل طالب) = 7 استعلامات لـ 5 طلاب
        // بعد الإصلاح: 1 (الـ paginator) + 1 (withCount) + 2 (استعلامان مجمَّعان: whereIn + MAX) = 4 استعلامات
        //
        // نقبل هامش سماح صغير (≤ 5 استعلامات) ليشمل: paginator count, paginator select,
        // withCount subquery, lastViolations subquery (whereIn), lastViolations subquery (MAX).
        $this->assertLessThanOrEqual(
            5,
            count($queries),
            'عدد الاستعلامات يجب ألا يتجاوز 5 (N+1 fix)، ولكن تم تنفيذ: ' . count($queries)
        );
    }
}
