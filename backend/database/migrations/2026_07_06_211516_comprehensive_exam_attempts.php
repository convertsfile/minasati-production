<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('comprehensive_exam_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('comprehensive_exam_id')->constrained('comprehensive_exams')->cascadeOnDelete();

            $table->dateTime('started_at');
            $table->dateTime('ends_at');
            $table->dateTime('completed_at')->nullable();

            $table->boolean('is_completed')->default(false);
            $table->integer('score')->nullable();
            $table->boolean('is_passed')->default(false);

            $table->enum('status', ['in_progress', 'graded', 'needs_review', 'late_submission'])->default('in_progress');

            $table->timestamps();
        });

        Schema::create('comprehensive_exam_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attempt_id')->constrained('comprehensive_exam_attempts')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('comprehensive_exam_questions')->cascadeOnDelete();

            $table->json('selected_options')->nullable(); // للخيارات المتعددة والـ MCQ
            $table->text('essay_text')->nullable(); // للأسئلة المقالية

            $table->boolean('is_correct')->default(false);
            $table->integer('points_earned')->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comprehensive_exam_answers');
        Schema::dropIfExists('comprehensive_exam_attempts');
    }
};