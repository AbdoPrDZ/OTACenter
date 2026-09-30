<?php

namespace App\Models;

use App\Models\Traits\Tabling;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Spatie\Permission\PermissionRegistrar;
use Spatie\Permission\Models\Permission as BasePermission;
use Spatie\Permission\Support\Config;

class Permission extends BasePermission
{
  use Tabling;

  protected $filterable = ['name'];

  /**
   * A permission belongs to some users.
   *
   * Overridden from Spatie to always resolve the app's User model instead of
   * `getModelForGuard(config('auth.defaults.guard'))`. During Sanctum-authenticated
   * API requests `auth:sanctum` sets the default guard to `sanctum`, which has no
   * provider, so Spatie's default `users()` relation resolves a `null` model and
   * throws "Class name must be a valid object or a string".
   */
  public function users(): BelongsToMany
  {
    return $this->morphedByMany(
      // getModelForGuard($this->attributes['guard_name'] ?? config('auth.defaults.guard')),
      User::class,
      'model',
      Config::modelHasPermissionsTable(),
      app(PermissionRegistrar::class)->pivotPermission,
      Config::morphKey()
    );
  }
}
