<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
  /**
   * Whether the OTA client may skip this version's update or is forced into it.
   */
  public function up(): void
  {
    Schema::table('versions', function (Blueprint $table) {
      $table->enum('update_type', ['optional', 'force'])->default('optional')->after('status');
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::table('versions', function (Blueprint $table) {
      $table->dropColumn('update_type');
    });
  }
};
