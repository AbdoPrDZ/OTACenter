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
    Schema::create('logs', function (Blueprint $table) {
      $table->id();
      $table->string('event')->index();
      $table->string('message')->nullable();
      $table->json('meta')->nullable();
      $table->string('ip')->nullable();
      $table->timestamps();
    });

    // Many-to-many polymorphic holders: a single log can be attached to a
    // user, an app, a version, a bundle, a device, a review… (a relation, not a
    // JSON array, so it is queryable from either side).
    Schema::create('log_holders', function (Blueprint $table) {
      $table->id();
      $table->foreignId('log_id')->constrained('logs')->cascadeOnDelete();
      $table->string('holder_type');
      $table->unsignedBigInteger('holder_id');
      $table->timestamps();

      $table->index(['holder_type', 'holder_id']);
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::dropIfExists('log_holders');
    Schema::dropIfExists('logs');
  }
};
