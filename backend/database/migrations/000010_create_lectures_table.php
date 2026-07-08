<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('lectures', function (Blueprint $table) {
            $table->id();
            // Restrict بدلاً من Cascade لحماية البيانات، أو تركها تعتمد على الـ Soft Deletes للكورس
            $table->foreignId('course_id')->constrained()->onDelete('restrict');
            $table->string('title');
            $table->text('description')->nullable();
            $table->integer('order_index')->default(0);
            $table->boolean('is_locked')->default(true);

            // 🚀 التخزين والمعالجة (Video Engine & Storage) تم توحيدها وتنقيتها
            $table->enum('encoding_status', ['raw', 'pending', 'processing', 'completed', 'failed'])->default('pending');
            $table->string('b2_video_path')->nullable(); // مسار الفيديو الخام
            $table->string('b2_hls_path')->nullable(); // مسار مجلد الـ HLS
            $table->string('m3u8_path')->nullable(); // مسار ملف التشغيل
            $table->unsignedBigInteger('size_bytes')->default(0);

            // التشفير (DRM)
            $table->string('raw_key')->nullable();
            $table->text('encryption_key')->nullable();

            $table->integer('video_duration')->nullable(); // بالثواني
            $table->unsignedInteger('max_views')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // الفهارس لسرعة بحث الـ Workers
            $table->index('encoding_status');
            $table->index(['course_id', 'order_index']); // لتسريع عرض المحاضرات بالترتيب
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lectures');
    }
};