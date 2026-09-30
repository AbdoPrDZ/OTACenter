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
    Schema::create('apps', function (Blueprint $table) {
      $table->id();
      $table->string('name');
      $table->string('package_name')->unique();
      $table->string('summary')->nullable();
      $table->string('description')->nullable();
      $table->string('logo_id')->nullable();
      $table->foreign('logo_id')->references('name')->on('files')->cascadeOnDelete();
      $table->timestamps();
      $table->softDeletes();
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::dropIfExists('apps');
  }
};
