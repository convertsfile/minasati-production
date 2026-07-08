<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('lectures', function (Blueprint $table) {
            // إضافة الحقل فقط إذا لم يكن موجوداً لمنع خطأ الـ Duplicate
            if (!Schema::hasColumn('lectures', 'video_status')) {
                $table->string('video_status')->default('pending')->after('is_locked');
            }

            if (!Schema::hasColumn('lectures', 'raw_key')) {
                $table->string('raw_key')->nullable()->after('video_status');
            }

            if (!Schema::hasColumn('lectures', 'm3u8_path')) {
                $table->string('m3u8_path')->nullable()->after('raw_key');
            }

            if (!Schema::hasColumn('lectures', 'video_duration')) {
                $table->integer('video_duration')->nullable()->after('m3u8_path');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lectures', function (Blueprint $table) {
            if (Schema::hasColumn('lectures', 'video_status')) {
                $table->dropColumn('video_status');
            }
        });
    }
};