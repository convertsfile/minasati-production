<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained()->onDelete('cascade');
            $table->text('body');
            $table->json('options'); // خيارات MCQ
            $table->tinyInteger('correct_answer')->nullable();
            $table->unsignedInteger('order_index')->default(0);

            $table->enum('question_type', ['mcq', 'multi_select'])->default('mcq');
            $table->string('image_url')->nullable();
            $table->json('option_images')->nullable();
            $table->json('correct_answers')->nullable();
            $table->unsignedInteger('points')->default(1);
            $table->unsignedInteger('time_limit_seconds')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('questions');
    }
};
