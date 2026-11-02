<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use App\Src\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UserController extends Controller
{
  public function index(Request $request)
  {
    return User::tablingCollect(
      $request,
      selects: ['users.*'],
      load: ['domains'],
    );
  }

  public function show(User $user)
  {
    return $this->apiSuccessResponse('User retrieved successfully', [
      'item' => $user->toArray(),
    ]);
  }

  public function destroy(Request $request, User $user)
  {
    if ((int) $request->user()->id === (int) $user->id)
      return $this->apiErrorResponse('You cannot delete your own account.');

    if (!self::mayManageSecurityOf($request->user(), $user))
      return $this->apiErrorResponse('Only a super-admin can delete a super-admin.', [], 403);

    $user->delete();

    return $this->apiSuccessResponse('User deleted successfully');
  }

  public function invite(Request $request)
  {
    $request->validate([
      'name'      => 'required|string|max:255',
      'email'     => 'required|email|unique:users,login',
      'role'      => 'required|exists:roles,name',
      'domain_id' => 'nullable|exists:domains,id',
    ]);

    $user = User::create([
      'name'  => $request->name,
      'login' => $request->email,
    ]);

    $role = Role::where('name', $request->role)->first();
    $user->assignRole($role->name);
    // $permissions = $role->permissions->pluck('name')->toArray();
    // $user->givePermissionTo($permissions);

    if ($request->filled('domain_id'))
      $user->domains()->attach($request->domain_id);

    $code = strtoupper(Str::random(8));
    $token = $user->createToken('register', ['user.invite'], ['code' => $code], now()->addDays(7));

    $link = route('register', [
      'token' => $token->plainTextToken,
    ]);

    ## Send email to the user with the invite link and code

    return $this->apiSuccessResponse('User invited successfully', [
      'link'  => $link,
    ]);
  }

}
