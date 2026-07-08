<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('comprehensive_exam_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('comprehensive_exam_id')->constrained('comprehensive_exams')->cascadeOnDelete();

            $table->enum('question_type', ['mcq', 'multi_select', 'essay']);
            $table->text('body');

            $table->json('options')->nullable(); // مصفوفة نصوص للخيارات
            $table->json('correct_answers')->nullable(); // مصفوفة أرقام (Indexes) للإجابات الصحيحة

            $table->string('image_url')->nullable(); // صورة ملحقة بالسؤال
            $table->json('option_images')->nullable(); // صور ملحقة بالخيارات

            $table->integer('points')->default(1); // درجة السؤال

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comprehensive_exam_questions');
    }
};
