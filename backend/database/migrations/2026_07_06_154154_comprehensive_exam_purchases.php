<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('comprehensive_exam_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('comprehensive_exam_id')->constrained('comprehensive_exams')->cascadeOnDelete();
            $table->integer('amount_paid'); // لتسجيل كم دفع الطالب وقتها
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comprehensive_exam_purchases');
    }
};