<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_numbers', function (Blueprint $table) {
            $table->id();
            $table->enum('provider', ['instapay', 'vodafone_cash']);
            $table->string('number', 20);
            $table->integer('display_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['provider', 'is_active', 'display_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_numbers');
    }
};
