<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('wallet_topup_requests', function (Blueprint $table) {
            $table->id();
            // 🚀 تعديل: استخدام restrict يمنع حذف المستخدم طالما له طلبات شحن مالية مسجلة
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            // 🚀 تعديل: لا نحذف الطلب إذا تم حذف رقم الدفع، بل نجعله null للحفاظ على السجل
            $table->foreignId('payment_number_id')->nullable()->constrained()->nullOnDelete();

            // 🚀 تعديل: unsigned لمنع أي أخطاء برمجية تدخل قيماً سالبة
            $table->unsignedInteger('amount');
            $table->unsignedInteger('verified_amount')->nullable();

            $table->enum('payment_method', ['instapay', 'vodafone_cash']);
            $table->string('proof_image_url');
            $table->enum('status', ['pending', 'approved', 'declined', 'amount_mismatch'])->default('pending');
            $table->text('admin_notes')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            // 🚀 تعديل: إضافة SoftDeletes للسجلات المالية
            $table->softDeletes();
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_topup_requests');
    }
};