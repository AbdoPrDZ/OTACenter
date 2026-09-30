<?php

namespace App\Http\Middleware;

use App\Src\Controller;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Spatie\Permission\Guard;
use Spatie\Permission\Support\Config;

class RoleMiddleware extends \Spatie\Permission\Middleware\RoleMiddleware
{

  public function handle(Request $request, Closure $next, $role, ?string $guard = null)
  {
    $authGuard = Auth::guard($guard);

    $user = $authGuard->user();

    // For machine-to-machine Passport clients
    if (! $user && $request->bearerToken() && Config::usePassportClientCredentials()) {
      $user = Guard::getPassportClient($guard);
    }

    if (! $user) {
      throw UnauthorizedException::notLoggedIn();
    }

    if (! method_exists($user, 'hasAnyRole')) {
      throw UnauthorizedException::missingTraitHasRoles($user);
    }

    $roles = explode('|', self::parseRolesToString($role));

    if (! $user->hasAnyRole($roles)) {
      $exception = UnauthorizedException::forRoles($roles);

      if (Controller::wantsJson()) {
        return Controller::apiErrorResponse(
          message: $exception->getMessage(),
          code: 403,
        );
      }

      throw $exception;
    }

    return $next($request);
  }
}
