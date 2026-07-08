<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('temp_user_id')->nullable()->unique();
            $table->string('name')->nullable();
            $table->string('full_name');
            $table->enum('academic_year', ['grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12', 'other'])->default('other');
            $table->string('student_number')->unique();
            $table->string('phone')->unique();
            $table->string('parent_phone');
            $table->string('school');
            $table->string('parent_job')->nullable();
            $table->string('governorate');
            $table->string('email')->unique();
            $table->boolean('is_verified')->default(false);
            $table->string('password');
            $table->boolean('is_blocked')->default(false);
            $table->unsignedTinyInteger('unblock_count')->default(0);
            $table->string('id_image')->nullable();
            $table->enum('status', ['pending', 'active', 'rejected'])->default('pending');
            $table->unsignedInteger('wallet_balance')->default(0);
            $table->string('rejection_reason')->nullable();
            $table->enum('role', ['student', 'admin'])->default('student');
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();

            // فهارس إضافية للوحات التحكم
            $table->index('academic_year');
            $table->index(['role', 'status'], 'users_role_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};