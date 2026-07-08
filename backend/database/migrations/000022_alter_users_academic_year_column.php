<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Change academic_year from integer to string
        Schema::table('users', function ($table) {
            $table->string('academic_year', 50)->change();
        });
    }

    public function down(): void
    {
        // Revert back to integer
        Schema::table('users', function ($table) {
            $table->integer('academic_year')->change();
        });
    }
};
