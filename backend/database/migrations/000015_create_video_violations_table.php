<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('video_violations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('lecture_id')->constrained()->restrictOnDelete();
            $table->enum('violation_type', ['screenshot', 'screen_recording', 'devtools', 'tab_switch'])->index();
            $table->string('user_agent')->nullable();
            $table->string('ip_address')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'lecture_id']);

            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('video_violations');
    }
};
