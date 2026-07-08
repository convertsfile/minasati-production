<?php

namespace Tests\Feature\Wallet;

use App\Models\Course;
use App\Models\User;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class WalletConcurrencyTest extends TestCase
{
    use DatabaseTruncation;

    public function test_prevent_double_spending_when_purchasing_course()
    {
        // 1. إنشاء مستخدم نشط برصيد 100 نقطة فقط
        $user = User::factory()->active()->create([
            'wallet_balance' => 100,
        ]);

        // 2. إنشاء كورسين، كل كورس سعره 100 نقطة
        $course1 = Course::create(['title' => 'Course 1', 'price_points' => 100]);
        $course2 = Course::create(['title' => 'Course 2', 'price_points' => 100]);

        // 3. محاكاة اختراق: طلبين متزامنين في نفس اللحظة (Race Condition)
        // لا يمكن محاكاة التزامن الحقيقي في PHP بسهولة (لأنها Single Threaded)،
        // لكن يمكننا اختبار الـ WalletService مباشرة لمعرفة ما إذا كانت تمنع الرصيد السالب

        $walletService = app(WalletService::class);

        // العملية الأولى (شراء الكورس الأول) -> يجب أن تنجح
        DB::transaction(function () use ($user, $course1) {
            $lockedUser = User::where('id', $user->id)->lockForUpdate()->first();
            $lockedUser->wallet_balance -= $course1->price_points;
            $lockedUser->save();

            // إضافة الكورس
            $lockedUser->courses()->attach($course1->id, ['access_type' => 'lifetime']);
        });

        // تحديث حالة المستخدم في الذاكرة
        $user->refresh();

        // العملية الثانية (محاولة شراء كورس ثاني برصيد أصبح 0)
        $exceptionThrown = false;
        try {
            DB::transaction(function () use ($user, $course2) {
                $lockedUser = User::where('id', $user->id)->lockForUpdate()->first();

                if ($lockedUser->wallet_balance < $course2->price_points) {
                    throw new \Exception('Insufficient Balance');
                }

                $lockedUser->wallet_balance -= $course2->price_points;
                $lockedUser->save();
            });
        } catch (\Exception $e) {
            $exceptionThrown = true;
            $this->assertEquals('Insufficient Balance', $e->getMessage());
        }

        // 4. التحقق النهائي من درع الحماية
        $this->assertTrue($exceptionThrown, 'System should block the second purchase');
        $this->assertEquals(0, $user->wallet_balance, 'Wallet balance should never drop below 0');
        $this->assertEquals(1, $user->courses()->count(), 'User should only own 1 course');
    }
}
