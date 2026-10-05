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
    // `description` and the changelogs are written as free text but were only
    // VARCHAR(255), so anything longer failed with "value too long for type
    // character varying(255)". They are TEXT now.
    Schema::table('apps', function (Blueprint $table) {
      $table->text('description')->nullable()->change();
    });

    Schema::table('versions', function (Blueprint $table) {
      $table->text('changelog')->nullable()->change();
    });

    Schema::table('bundles', function (Blueprint $table) {
      $table->text('changelog')->nullable()->change();
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::table('apps', function (Blueprint $table) {
      $table->string('description')->nullable()->change();
    });

    Schema::table('versions', function (Blueprint $table) {
      $table->string('changelog')->nullable()->change();
    });

    Schema::table('bundles', function (Blueprint $table) {
      $table->string('changelog')->nullable()->change();
    });
  }
};
