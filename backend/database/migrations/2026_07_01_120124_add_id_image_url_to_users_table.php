<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // إضافة العمود الجديد. جعلنا حجمه 500 ليتحمل روابط (Backblaze B2) الطويلة
            $table->string('id_image_url', 500)->nullable()->after('id_image');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('id_image_url');
        });
    }
};