<?php

namespace App\Models;

use App\Models\Traits\Tabling;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Spatie\Permission\PermissionRegistrar;
use Spatie\Permission\Models\Role as BaseRole;
use Spatie\Permission\Support\Config;

class Role extends BaseRole
{
  use Tabling;

  protected $filterable = ['name'];

  /**
   * A role belongs to some users.
   *
   * Overridden from Spatie to always resolve the app's User model instead of
   * `getModelForGuard(config('auth.defaults.guard'))`. During Sanctum-authenticated
   * API requests `auth:sanctum` sets the default guard to `sanctum`, which has no
   * provider, so Spatie's default `users()` relation resolves a `null` model and
   * throws "Class name must be a valid object or a string".
   */
  public function users(): BelongsToMany
  {
    $registrar = app(PermissionRegistrar::class);

    return $this->morphedByMany(
      User::class,
      'model',
      Config::modelHasRolesTable(),
      $registrar->pivotRole,
      Config::morphKey()
    );
  }
}
