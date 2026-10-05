<?php

namespace App\Http\Controllers;

use App\Models\Log;
use App\Models\User;
use App\Src\Controller;
use App\Src\ValidationType;
use Hash;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{

  public function register(Request $request)
  {
    $request->validate([
      'code'     => 'required|string|max:255',
      'name'     => 'required|string|max:255',
      'login'    => 'required|string|email|max:255|unique:users,login,' . $request->user()->id,
      'password' => 'required|string|min:8|confirmed',
    ]);

    $user = $request->user();
    $tokenData = $user->currentAccessToken()->data;

    if (($tokenData['code'] ?? null) !== $request->code)
      return $this->apiSingleErrorResponse('code', 'Invalid code');

    if ($user->login !== $request->login)
      return $this->apiErrorResponse('Wrong login provided. You can only register with your invite email address.');

    $user->update([
      'name'     => $request->name,
      'login'    => $request->login,
      'password' => $request->password,
    ]);

    $user->currentAccessToken()->delete();

    return $this->apiSuccessResponse('User registered successfully');
  }

  public function login(Request $request)
  {
    $validator = Validator::make($request->all(), [
      'login'    => 'required',
      'password' => 'required',
      'remember' => 'nullable|boolean',
    ]);

    if ($validator->fails())
      return $this->apiInvalidValuesResponse($validator->errors()->toArray());

    $user = User::where('login', $request->login)->first();

    # Try authentication with the local database first, if the user exists and has a password set
    if ($user && $user->password)
      if (Hash::check($request->password, $user->password)) {
        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();
      } else {
        Log::record('auth.failed', "Failed login for {$request->login}", [], ['login' => $request->login]);
        return $this->apiErrorResponse('Invalid credentials');
      }
    # If the user doesn't exist in the local database, or if they don't have a password set, attempt LDAP authentication
    else {
      $login = $request->login;

      $suffix = env('LDAP_LOGIN_SUFFIX');
      if ($suffix && !str_contains($login, $suffix)) $login .= $suffix;

      $credentials = [
        'userprincipalname' => $login,
        'password' => $request->password,
      ];
      $remember = $request->boolean('remember');

      // Attempt LDAP authentication
      \Log::info('Attempting LDAP authentication with credentials: ' . json_encode($credentials));
      if (!Auth::attempt($credentials, $remember)) {
        \Log::warning('LDAP authentication failed for user: ' . $login);
        Log::record('auth.failed', "Failed login for {$login}", [], ['login' => $login]);
        return $this->apiErrorResponse('Invalid credentials');
      }
    }

    /**
     * @var User $user
     */
    $user = auth()->user();

    if (!$user)
      return $this->apiErrorResponse('Some gone wrong, please try again later.');

    Log::record('auth.login', "{$user->login} signed in", [$user]);

    return $this->apiSuccessResponse('User logged in successfully', [
      'token' => $user->createToken('user')->plainTextToken,
    ]);
  }

  public function me()
  {
    /**
     * @var User $user
     */
    $user = auth()->user();

    return $this->apiSuccessResponse("User retrieved successfully", [
      'user' => $this->userPayload($user),
    ]);
  }

  public function update(Request $request)
  {
    /**
     * @var User $user
     */
    $user = auth()->user();

    $rules = User::validationRules(ValidationType::Update, $user);
    $validator = Validator::make($request->all(), $rules);

    if ($validator->fails())
      return $this->apiInvalidValuesResponse($validator->errors()->toArray());

    $fields = array_diff(array_keys($rules), ['image']);
    $user->update($request->only($fields));

    if ($request->hasFile('image')) {
      $image = $this->moveFile($request, 'image', 'users', "image-$user->id-" . time());
      $user->image_id = $image->name;
      $user->save();
    }

    return $this->apiSuccessResponse("User updated successfully", [
      'user' => $this->userPayload($user),
    ]);
  }

  /**
   * Build the serialized user payload returned by /auth/me and /auth/profile,
   * including the user's roles and effective permissions so the frontend can
   * gate navigation and views on them.
   *
   * Note: a `super-admin` has no explicit permission grants — access is granted
   * through the role. The frontend should treat `roles` containing `super-admin`
   * as "has every permission".
   *
   * @param User $user
   * @return array<string, mixed>
   */
  private function userPayload(User $user): array
  {
    return [
      'id'          => $user->id,
      'name'        => $user->name,
      'login'       => $user->login,
      'image_url'   => $user->image_url,
      'roles'       => $user->getRoleNames(),
      'permissions' => $user->getAllPermissions()->pluck('name'),
      'domains'     => $user->domains
        ->map(fn ($domain) => [
          'id'   => $domain->id,
          'name' => $domain->name,
        ])
        ->values(),
      // 'echo_token' => $user->createToken('echo')->plainTextToken,
    ];
  }
  public function logout(Request $request)
  {
    /**
     * @var User $user
     */
    $user = auth()->user();
    $user->tokens()->delete();

    session()->flush();
    auth('web')->logout();

    Log::record('auth.logout', "{$user->login} signed out", [$user]);

    return $this->apiSuccessResponse('User logged out successfully');
  }

}
