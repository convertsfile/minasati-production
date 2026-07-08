<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('homeworks', function (Blueprint $table) {
            $table->id();
            // 🚀 تعديل: منع الحذف إذا كان هناك طلاب قدموا الواجب
            $table->foreignId('lecture_id')->constrained()->restrictOnDelete();
            $table->string('title');
            $table->string('file_path');
            $table->timestamps();
            $table->softDeletes(); // 🚀 تعديل: الحفاظ على الواجبات القديمة
        });

        Schema::create('homework_submissions', function (Blueprint $table) {
            $table->id();
            // 🚀 تعديل: منع فقدان درجات الطالب إذا تم حذف حسابه (نعتمد على الـ SoftDeletes في جدول Users)
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('homework_id')->constrained('homeworks')->restrictOnDelete();

            $table->string('file_path');
            $table->string('status', 20)->default('pending');
            $table->text('rejection_reason')->nullable();

            // 🚀 تعديل: استخدام unsignedInteger للدرجات لمنع التقييم بالسالب
            $table->unsignedInteger('score')->nullable();

            $table->timestamps();
            $table->softDeletes(); // 🚀 تعديل: الحفاظ على سجل تسليمات الطالب
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('homework_submissions');
        Schema::dropIfExists('homeworks');
    }
};