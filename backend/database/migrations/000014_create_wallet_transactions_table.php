<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            // 🚀 تعديل: المعاملات المالية لا تُحذف أبداً (Immutable Ledger)
            $table->foreignId('user_id')->constrained()->restrictOnDelete();

            $table->enum('type', ['top_up', 'purchase', 'refund', 'withdrawal']);
            // 🚀 تعديل: unsigned لحماية القيم، نوع العملية (type) هو ما يحدد هل هي خصم أم إيداع
            $table->unsignedInteger('amount');
            $table->unsignedInteger('balance_before');
            $table->unsignedInteger('balance_after');

            $table->string('reference')->unique()->nullable();
            $table->string('payment_method')->nullable();
            $table->string('description')->nullable();
            $table->enum('status', ['pending', 'completed', 'failed', 'cancelled'])->default('pending');
            $table->json('metadata')->nullable();

            $table->foreignId('payment_number_id')->nullable()->constrained('payment_numbers')->nullOnDelete();
            $table->foreignId('topup_request_id')->nullable()->constrained('wallet_topup_requests')->nullOnDelete();

            $table->timestamps();

            $table->index(['user_id', 'type'], 'wallet_tx_user_type_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
    }
};