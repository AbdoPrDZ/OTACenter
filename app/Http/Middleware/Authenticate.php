<?php

namespace App\Http\Middleware;

use App\Models\PersonalAccessToken;
use App\Src\Controller;
use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Contracts\Auth\Factory as Auth;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Illuminate\Http\Request;
use Laravel\Sanctum\Sanctum;

class Authenticate implements AuthenticatesRequests
{
  /**
   * The authentication factory instance.
   *
   * @var \Illuminate\Contracts\Auth\Factory
   */
  protected $auth;

  /**
   * Create a new middleware instance.
   *
   * @param  \Illuminate\Contracts\Auth\Factory  $auth
   * @return void
   */
  public function __construct(Auth $auth)
  {
    $this->auth = $auth;
  }

  /**
   * Specify the guards for the middleware.
   *
   * @param  string  $guard
   * @param  string  $others
   * @return string
   */
  public static function using(string $guard, ...$others)
  {
    return static::class . ':' . implode(',', [$guard, ...$others]);
  }

  /**
   * Handle an incoming request.
   *
   * @param  \Illuminate\Http\Request  $request
   * @param  \Closure  $next
   * @param  string[]  ...$guards
   * @return mixed
   *
   * @throws \Illuminate\Auth\AuthenticationException
   */
  public function handle(Request $request, Closure $next, ...$guards)
  {
    if ($this->authenticate($request, $guards)) {
      return $next($request);
    }

    return $this->unauthenticated($request, $guards);
  }

  /**
   * Determine if the user is logged in to any of the given guards.
   *
   * @param  array  $guards
   * @return boolean
   */
  protected function authenticate(Request $request, array $guards)
  {
    if (empty($guards)) $guards = [null];

    foreach ($guards as $guard) {
      $res = $this->auth->guard($guard)->check();
      if ($res) {
        $this->auth->shouldUse($guard);

        $requestToken = $request->bearerToken() ?: $request->query('token');

        $request_token = str_contains($requestToken, '|') ? explode('|', $requestToken)[1] : null;

        $request->attributes->set('request_token', $request_token);

        $token = PersonalAccessToken::findToken($request_token);

        $request->attributes->set('token', $token);

        return true;
      }
    }

    // $requestToken = $request->query('token');

    // if ($requestToken) {
    //   $accessToken = PersonalAccessToken::findToken($requestToken);

    //   if ($accessToken) {
    //     $request->attributes->set('request_token', $requestToken);
    //     $request->attributes->set('token', $accessToken);

    //     $expiration = config('sanctum.expiration');
    //     $isValid = (! $expiration || $accessToken->created_at->gt(now()->subMinutes($expiration)))
    //             && (! $accessToken->expires_at || ! $accessToken->expires_at->isPast());

    //     if (is_callable(Sanctum::$accessTokenAuthenticationCallback))
    //       $isValid = (bool) (Sanctum::$accessTokenAuthenticationCallback)($accessToken, $isValid);

    //     if ($isValid) {
    //       $this->auth->shouldUse('sanctum');

    //       return true;
    //     }

    //     return $isValid;
    //   }
    // }

    return false;
  }

  /**
   * Handle an unauthenticated user.
   *
   * @param  \Illuminate\Http\Request  $request
   * @param  array  $guards
   * @return \Illuminate\Http\JsonResponse|\Illuminate\Http\RedirectResponse
   *
   * @throws \Illuminate\Auth\AuthenticationException
   */
  protected function unauthenticated(Request $request, array $guards)
  {
    if ($request->expectsJson())
      return Controller::apiErrorResponse('Unauthenticated', code: 401);

    throw new AuthenticationException(
      'Unauthenticated',
      $guards,
      route(...$this->getAuthRoute($guards[0]))
    );
  }

  public function getAuthRoute(?string $guard = null): array
  {
    return ['auth', ['/login']];
    // return match ($guard) {
    //   'dashboard' => ['dashboard.auth', ['/login']],
    //   'user' => ['user.auth', ['/login']],
    //   default => ['home'],
    // };
  }
}
