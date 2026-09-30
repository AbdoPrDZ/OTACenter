<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Src\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PermissionController extends Controller
{
  public function index(Request $request)
  {
    return Permission::tablingCollect(
      $request,
      selects: ['permissions.*'],
    );
  }

  public function indexByRole(Request $request, Role $role)
  {
    return Permission::tablingCollect(
      $request,
      selects: ['permissions.*'],
      query: Permission::query()->whereHas('roles', function ($query) use ($role) {
        $query->where('roles.id', $role->id);
      })
    );
  }

  public function attachToRole(Request $request, Role $role, Permission $permission)
  {
    if ($role->permissions()->where('permissions.id', $permission->id)->exists())
      return $this->apiErrorResponse('Permission already attached to this role.');

    $role->permissions()->attach($permission);

    return $this->apiSuccessResponse('Permission attached to role successfully.');
  }

  public function detachFromRole(Request $request, Role $role, Permission $permission)
  {
    if (!$role->permissions()->where('permissions.id', $permission->id)->exists())
      return $this->apiErrorResponse('Role does not have this permission attached.');

    $role->permissions()->detach($permission);

    return $this->apiSuccessResponse('Permission detached from role successfully.');
  }

  public function indexByUser(Request $request, User $user)
  {
    $directIds = DB::table('model_has_permissions')
      ->where('model_type', User::class)
      ->where('model_id', $user->id)
      ->pluck('permission_id')
      ->map(fn ($id) => (int) $id)
      ->all();

    return Permission::tablingCollect(
      $request,
      selects: ['permissions.*'],
      query: Permission::query()->where(function ($query) use ($user) {
        $query->whereHas('users', function ($query) use ($user) {
          $query->where('users.id', $user->id);
        })->orWhereExists(function ($query) use ($user) {
          $query->selectRaw('1')
            ->from('model_has_roles')
            ->join('role_has_permissions', 'role_has_permissions.role_id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_type', User::class)
            ->where('model_has_roles.model_id', $user->id)
            ->whereColumn('role_has_permissions.permission_id', 'permissions.id');
        });
      }),
      map: function ($permission) use ($directIds) {
        $permission->setAttribute('direct', in_array((int) $permission->id, $directIds));
        return $permission;
      },
    );
  }

  public function attachToUser(Request $request, User $user, Permission $permission)
  {
    if ($user->hasDirectPermission($permission))
      return $this->apiErrorResponse('Permission already assigned to this user.');

    $user->givePermissionTo($permission);

    return $this->apiSuccessResponse('Permission assigned to user successfully.');
  }

  public function detachFromUser(Request $request, User $user, Permission $permission)
  {
    if (!$user->hasDirectPermission($permission))
      return $this->apiErrorResponse('User does not have this permission assigned.');

    $user->revokePermissionTo($permission);

    return $this->apiSuccessResponse('Permission unassigned from user successfully.');
  }
}
