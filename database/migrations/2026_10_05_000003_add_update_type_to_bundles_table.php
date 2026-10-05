<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
  /**
   * Whether the OTA client may skip this bundle's update or is forced into it.
   */
  public function up(): void
  {
    Schema::table('bundles', function (Blueprint $table) {
      $table->enum('update_type', ['optional', 'force'])->default('optional')->after('status');
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::table('bundles', function (Blueprint $table) {
      $table->dropColumn('update_type');
    });
  }
};
