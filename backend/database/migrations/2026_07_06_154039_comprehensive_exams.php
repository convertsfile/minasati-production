<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('comprehensive_exams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();

            // البيانات الأساسية
            $table->string('title');
            $table->text('instructions')->nullable();

            // اللوجستيات الزمنية
            $table->dateTime('start_time');
            $table->dateTime('end_time');
            $table->integer('duration_minutes');
            $table->integer('pass_score');
            $table->integer('max_attempts')->default(1);

            // قواعد النزاهة
            $table->boolean('shuffle_questions')->default(true);
            $table->boolean('shuffle_options')->default(true);
            $table->boolean('delay_results')->default(true);

            // 🚀 الميزة الجديدة: إمكانية الوصول والتسعير
            $table->enum('accessibility', ['enrolled_only', 'everyone'])->default('enrolled_only');
            $table->integer('price_points')->default(0); // 0 تعني مجاني، أي رقم آخر يعني مدفوع لغير المشتركين

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comprehensive_exams');
    }
};
