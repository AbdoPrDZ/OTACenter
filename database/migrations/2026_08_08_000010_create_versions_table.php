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
    Schema::create('versions', function (Blueprint $table) {
      $table->id();
      $table->foreignId('app_id')->constrained('apps')->cascadeOnDelete();
      $table->string('name');
      $table->string('changelog')->nullable();
      $table->enum('status', ['draft', 'review', 'published', 'cancelled'])->default('draft');
      $table->string('file_id');
      $table->foreign('file_id')->references('name')->on('files')->cascadeOnDelete();
      $table->string('api_key');
      $table->string('default_bundle_version');
      $table->timestamps();
      $table->softDeletes();

      $table->unique('file_id');
    });

    Schema::table('apps', function (Blueprint $table) {
      $table->foreignId('latest_id')->nullable()->constrained('versions')->nullOnDelete();
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::dropIfExists('versions');
    Schema::table('apps', function (Blueprint $table) {
      $table->dropForeign(['latest_id']);
      $table->dropColumn('latest_id');
    });
  }
};
