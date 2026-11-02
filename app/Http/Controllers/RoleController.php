<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use App\Src\Controller;
use Illuminate\Http\Request;

class RoleController extends Controller
{
  public function index(Request $request)
  {
    return Role::tablingCollect(
      $request,
      selects: ['roles.*'],
    );
  }

  public function show(Role $role)
  {
    return $this->apiSuccessResponse("Role retrieved successfully.", [
      'item' => $role,
    ]);
  }

  public function indexUsers(Request $request, Role $role)
  {
    return User::tablingCollect(
      $request,
      selects: ['users.*'],
      query: User::query()->whereHas('roles', function ($query) use ($role) {
        $query->where('roles.id', $role->id);
      })
    );
  }

  public function indexByUser(Request $request, User $user)
  {
    return Role::tablingCollect(
      $request,
      selects: ['roles.*'],
      query: Role::query()->whereHas('users', function ($query) use ($user) {
        $query->where('users.id', $user->id);
      })
    );
  }

  public function attachToUser(Request $request, Role $role, User $user)
  {
    if (!self::mayManageSecurityOf($request->user(), $role) || !self::mayManageSecurityOf($request->user(), $user))
      return $this->apiErrorResponse("Only a super-admin can manage super-admin access.", [], 403);

    if ($user->roles()->where('roles.id', $role->id)->exists()) {
      return $this->apiErrorResponse("User already attached to this role.");
    }

    $user->roles()->attach($role);

    return $this->apiSuccessResponse("Role attached to user successfully.");
  }

  /** `POST /user/{user}/role/{role}` — same as attachToUser, route params in user-first order. */
  public function attachRoleToUser(Request $request, User $user, Role $role)
  {
    return $this->attachToUser($request, $role, $user);
  }

  /** `DELETE /user/{user}/role/{role}` — same as detachFromUser, route params in user-first order. */
  public function detachRoleFromUser(Request $request, User $user, Role $role)
  {
    return $this->detachFromUser($request, $role, $user);
  }

  public function detachFromUser(Request $request, Role $role, User $user)
  {
    if (!self::mayManageSecurityOf($request->user(), $role) || !self::mayManageSecurityOf($request->user(), $user))
      return $this->apiErrorResponse("Only a super-admin can manage super-admin access.", [], 403);

    if (!$user->roles()->where('roles.id', $role->id)->exists()) {
      return $this->apiErrorResponse("User does not have this role attached.");
    }

    $user->roles()->detach($role);

    return $this->apiSuccessResponse("Role detached from user successfully.");
  }
}
