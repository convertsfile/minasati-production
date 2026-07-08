<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lecture_id')->constrained()->onDelete('cascade');
            $table->tinyInteger('form_index')->default(1); // 1, 2, or 3
            $table->string('title')->nullable();
            $table->text('instructions')->nullable();
            $table->unsignedInteger('duration_minutes')->default(30);
            $table->unsignedInteger('pass_score')->default(60);

            // 🚀 الإعدادات المتقدمة المدمجة
            $table->boolean('shuffle_questions')->default(true);
            $table->boolean('shuffle_options')->default(true);
            $table->unsignedInteger('max_attempts')->default(1);
            $table->boolean('show_correct_answers')->default(true);
            $table->boolean('show_score')->default(true);
            $table->boolean('per_question_time')->default(false);
            $table->unsignedInteger('random_question_count')->nullable();

            $table->timestamps();

            $table->unique(['lecture_id', 'form_index']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exams');
    }
};
