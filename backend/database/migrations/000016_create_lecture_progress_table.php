<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('lecture_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('lecture_id')->constrained()->onDelete('cascade');

            // 🚀 تعديل: unsignedInteger أسرع بكثير في قواعد البيانات وأكثر دقة من float
            $table->boolean('is_unlocked')->default(false);
            $table->unsignedInteger('watch_time_seconds')->default(0);
            $table->unsignedInteger('views_count')->default(0);
            $table->boolean('is_completed')->default(false);
            $table->timestamp('unlocked_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'lecture_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lecture_progress');
    }
};