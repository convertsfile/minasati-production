<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (! User::where('email', 'admin@eduplatform.com')->exists()) {
            User::create([
                'full_name' => 'System Admin',
                'email' => 'admin@eduplatform.com',
                'phone' => '01000000000',
                'parent_phone' => '01000000000',
                'academic_year' => 99,                 // 👈 أعدناه إلى رقم لأن قاعدة البيانات تتوقع رقماً
                'student_number' => 'ADMIN-001',
                'school' => 'الإدارة المركزية',
                'parent_job' => 'مدير النظام',
                'governorate' => 'القاهرة',
                'password' => Hash::make('password123'),
                'status' => 'active',
                'role' => 'admin',
                'is_admin' => true,
                'is_verified' => true,
                'is_blocked' => false,
            ]);

            $this->command->info('✅ تم إنشاء حساب الإدارة بنجاح!');
        } else {
            $this->command->info('⚠️ حساب الإدارة موجود مسبقاً.');
        }
    }
}
