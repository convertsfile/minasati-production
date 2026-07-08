<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('forum_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->text('body');
            $table->string('image')->nullable();
            $table->text('admin_reply')->nullable();
            $table->string('admin_reply_audio')->nullable();
            $table->string('admin_reply_image')->nullable();
            $table->timestamp('replied_at')->nullable();
            $table->timestamps();

            $table->index('user_id');
            $table->index('created_at');

            $table->SoftDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('forum_posts');
    }
};
