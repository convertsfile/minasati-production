<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('center_codes', function (Blueprint $table) {
            $table->id();
            $table->string('type', 20)->default('course');
            $table->string('code', 20)->unique();
            $table->string('student_phone', 20)->nullable();
            $table->foreignId('course_id')->constrained()->restrictOnDelete();
            $table->foreignId('lecture_id')->nullable()->constrained('lectures')->restrictOnDelete();
            $table->foreignId('used_by')->nullable()->constrained('users')->onDelete('set null');
            $table->json('accumulator_lectures')->nullable();
            $table->timestamp('used_at')->nullable();
            $table->timestamps();
            $table->index(['course_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('center_codes');
    }
};
