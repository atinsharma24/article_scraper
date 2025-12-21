<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('articles', function (Blueprint $table) {
            $table->id();

            $table->string('type');
            $table->foreignId('parent_id')->nullable()->constrained('articles')->nullOnDelete();

            $table->string('title');
            $table->string('slug')->nullable();
            $table->longText('content');

            $table->string('source_url')->nullable();
            $table->timestampTz('published_at')->nullable();
            $table->jsonb('references')->nullable();

            $table->timestamps();

            $table->unique('source_url');
            $table->index(['type', 'parent_id']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('articles');
    }
};
