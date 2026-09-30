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
    Schema::create('devices', function (Blueprint $table) {
      $table->id();
      $table->string('did')->unique();
      $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
      $table->string('manufacturer')->nullable();
      $table->string('brand')->nullable();
      $table->string('model')->nullable();
      $table->string('android_version')->nullable();
      $table->string('sdk_version')->nullable();
      $table->timestamps();
      $table->softDeletes();
    });

    Schema::create('device_apps', function (Blueprint $table) {
      $table->id();
      $table->timestamps();
      $table->foreignId('device_id')->constrained('devices')->cascadeOnDelete();
      $table->foreignId('app_id')->constrained('apps')->cascadeOnDelete();
      $table->foreignId('version_id')->constrained('versions')->cascadeOnDelete();
      $table->foreignId('bundle_id')->nullable()->constrained('bundles')->cascadeOnDelete();
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::dropIfExists('devices');
    Schema::dropIfExists('device_apps');
  }
};
