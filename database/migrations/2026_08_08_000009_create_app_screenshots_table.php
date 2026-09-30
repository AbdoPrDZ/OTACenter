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
    Schema::create('app_screenshots', function (Blueprint $table) {
      $table->id();
      $table->foreignId('app_id')->constrained('apps')->cascadeOnDelete();
      $table->string('file_id');
      $table->timestamps();

      $table->foreign('file_id')->references('name')->on('files')->cascadeOnDelete();
      $table->unique(['app_id', 'file_id']);
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::dropIfExists('app_screenshots');
  }
};
