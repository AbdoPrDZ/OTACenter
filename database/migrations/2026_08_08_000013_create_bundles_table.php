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
    Schema::create('bundles', function (Blueprint $table) {
      $table->id();
      $table->foreignId('version_id')->constrained('versions')->cascadeOnDelete();
      $table->string('name');
      $table->string('changelog')->nullable();
      $table->enum('status', ['draft', 'review', 'published', 'cancelled'])->default('draft');
      $table->string('file_id');
      $table->foreign('file_id')->references('name')->on('files')->cascadeOnDelete();
      $table->unique('file_id');
      $table->timestamps();
      $table->softDeletes();
    });

    Schema::table('versions', function (Blueprint $table) {
      $table->foreignId('latest_id')->nullable()->constrained('bundles')->nullOnDelete();
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::dropIfExists('bundles');
    Schema::table('versions', function (Blueprint $table) {
      $table->dropForeign(['latest_id']);
      $table->dropColumn('latest_id');
    });
  }
};
