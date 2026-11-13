<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
  /** Lets an admin create device link codes for other users (kept in sync with SecuritySeeder). */
  private const PERMISSION = 'device.link';
  private const ROLES = ['super-admin', 'admin'];

  /**
   * Expo support and demo releases.
   *
   * - Versions record which client consumes them (`ota-client` or `expo`). An
   *   Expo version may have no installer file (it can ship through a store).
   * - An Expo bundle is an `npx expo export` upload; its files are listed in
   *   `bundle_assets`, one row per platform and file.
   * - Demo releases: versions and bundles can be marked `is_demo` and published
   *   through a second pointer (`demo_latest_id`) that only devices of users in
   *   a domain with `allow_demo` follow, until they are promoted.
   * - `device_link_codes` link an anonymous device to a user, which is what
   *   makes demo eligibility decidable.
   */
  public function up(): void
  {
    Schema::table('domains', function (Blueprint $table) {
      $table->boolean('allow_demo')->default(false)->after('is_public');
    });

    Schema::table('versions', function (Blueprint $table) {
      $table->string('client_type', 20)->default('ota-client')->after('name');
      $table->boolean('is_demo')->default(false)->after('status');
      $table->timestamp('promoted_at')->nullable()->after('is_demo');
      $table->foreignId('demo_latest_id')->nullable()->after('latest_id')
        ->constrained('bundles')->nullOnDelete();
      $table->string('file_id')->nullable()->change();
    });

    Schema::table('apps', function (Blueprint $table) {
      $table->foreignId('demo_latest_id')->nullable()->after('latest_id')
        ->constrained('versions')->nullOnDelete();
    });

    Schema::table('bundles', function (Blueprint $table) {
      $table->boolean('is_demo')->default(false)->after('status');
      $table->timestamp('promoted_at')->nullable()->after('is_demo');
      $table->uuid('expo_update_id')->nullable()->unique()->after('file_id');
      $table->json('expo_metadata')->nullable()->after('expo_update_id');
    });

    Schema::create('bundle_assets', function (Blueprint $table) {
      $table->id();
      $table->foreignId('bundle_id')->constrained('bundles')->cascadeOnDelete();
      $table->string('platform', 10);
      # Path inside the export (`_expo/static/js/android/index-….hbc`, `assets/…`).
      $table->string('source_path');
      # Path on the `public` disk.
      $table->string('path');
      # MD5 hex of the content: the asset key, as in Expo's reference server.
      $table->string('key', 32);
      # base64url SHA-256 (unpadded): what expo-updates verifies.
      $table->string('hash', 64);
      $table->string('content_type', 100);
      $table->string('file_extension', 20)->nullable();
      $table->boolean('is_launch_asset')->default(false);
      $table->unsignedBigInteger('size')->default(0);
      $table->timestamps();

      $table->index(['bundle_id', 'platform']);
    });

    Schema::create('device_link_codes', function (Blueprint $table) {
      $table->id();
      $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
      # Restricts the code to one app; null = any app.
      $table->foreignId('app_id')->nullable()->constrained('apps')->cascadeOnDelete();
      $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
      $table->string('code_hash', 64)->unique();
      $table->timestamp('expires_at');
      $table->timestamp('used_at')->nullable();
      $table->foreignId('device_id')->nullable()->constrained('devices')->nullOnDelete();
      $table->timestamps();
    });

    $this->grantPermission();
  }

  public function down(): void
  {
    Schema::dropIfExists('device_link_codes');
    Schema::dropIfExists('bundle_assets');

    Schema::table('bundles', function (Blueprint $table) {
      $table->dropUnique(['expo_update_id']);
      $table->dropColumn(['is_demo', 'promoted_at', 'expo_update_id', 'expo_metadata']);
    });

    Schema::table('apps', function (Blueprint $table) {
      $table->dropConstrainedForeignId('demo_latest_id');
    });

    Schema::table('versions', function (Blueprint $table) {
      $table->dropConstrainedForeignId('demo_latest_id');
      $table->dropColumn(['client_type', 'is_demo', 'promoted_at']);
    });

    Schema::table('domains', function (Blueprint $table) {
      $table->dropColumn('allow_demo');
    });

    $permissionId = DB::table('permissions')->where('name', self::PERMISSION)->value('id');
    if ($permissionId) {
      DB::table('role_has_permissions')->where('permission_id', $permissionId)->delete();
      DB::table('permissions')->where('id', $permissionId)->delete();
    }

    $this->forgetPermissionCache();
  }

  /** Same approach as the download-links migration: existing installs already ran the seeder. */
  private function grantPermission(): void
  {
    if (!Schema::hasTable('permissions')) return;

    $permissionId = DB::table('permissions')->where('name', self::PERMISSION)->value('id')
      ?? DB::table('permissions')->insertGetId([
        'name'       => self::PERMISSION,
        'guard_name' => 'web',
        'created_at' => now(),
        'updated_at' => now(),
      ]);

    $roleIds = DB::table('roles')->whereIn('name', self::ROLES)->pluck('id');

    foreach ($roleIds as $roleId) {
      DB::table('role_has_permissions')->insertOrIgnore([
        'permission_id' => $permissionId,
        'role_id'       => $roleId,
      ]);
    }

    $this->forgetPermissionCache();
  }

  private function forgetPermissionCache(): void
  {
    try {
      app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    } catch (\Throwable) {
      # Cache store not available during some migration runs — harmless.
    }
  }
};
