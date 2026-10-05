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
    Schema::create('reviews', function (Blueprint $table) {
      $table->id();
      $table->foreignId('app_id')->constrained('apps')->cascadeOnDelete();
      $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
      $table->foreignId('device_id')->nullable()->constrained('devices')->nullOnDelete();
      $table->unsignedTinyInteger('rating');
      $table->string('title')->nullable();
      $table->text('comment')->nullable();
      $table->enum('status', ['published', 'rejected'])->default('published');
      $table->timestamps();
      $table->softDeletes();

      $table->index(['app_id', 'status']);
      // One review per user per app. Postgres treats NULLs as distinct, so
      // device-only (anonymous) reviews are unaffected when user_id is null.
      $table->unique(['user_id', 'app_id']);
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::dropIfExists('reviews');
  }
};
