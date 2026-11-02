<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
  /** Roles that may generate download links (kept in sync with SecuritySeeder). */
  private const PERMISSION = 'app.download_link';
  private const ROLES = ['super-admin', 'admin', 'developer'];

  /**
   * Shareable download links (URL + QR code) generated from the dashboard.
   *
   * Each link carries a random token. The link works for public and private apps
   * alike — the token is the grant — and every download through it is counted
   * against the link's user. Only a SHA-256 hash is used for lookup; the token
   * itself is stored encrypted so the dashboard can show the link/QR again.
   */
  public function up(): void
  {
    Schema::create('download_links', function (Blueprint $table) {
      $table->id();
      $table->foreignId('app_id')->constrained('apps')->cascadeOnDelete();
      # The user downloads through this link are counted against.
      $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
      $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
      $table->string('label', 100)->nullable();
      $table->string('token_hash', 64)->unique();
      $table->text('token');
      $table->timestamp('expires_at')->nullable();
      $table->timestamp('revoked_at')->nullable();
      $table->timestamp('last_used_at')->nullable();
      $table->timestamps();
    });

    Schema::table('download_histories', function (Blueprint $table) {
      $table->foreignId('download_link_id')->nullable()->after('user_id')
        ->constrained('download_links')->nullOnDelete();
    });

    $this->grantPermission();
  }

  public function down(): void
  {
    Schema::table('download_histories', function (Blueprint $table) {
      $table->dropConstrainedForeignId('download_link_id');
    });

    Schema::dropIfExists('download_links');

    $permissionId = DB::table('permissions')->where('name', self::PERMISSION)->value('id');
    if ($permissionId) {
      DB::table('role_has_permissions')->where('permission_id', $permissionId)->delete();
      DB::table('permissions')->where('id', $permissionId)->delete();
    }

    $this->forgetPermissionCache();
  }

  /**
   * Existing installs already ran SecuritySeeder, so create the new permission
   * here too. On a fresh database the roles don't exist yet: the seeder then
   * creates and assigns it.
   */
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
