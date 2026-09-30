<?php

namespace App\Http\Middleware;

use App\Src\Controller;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Spatie\Permission\Guard;
use Spatie\Permission\Support\Config;

class PermissionMiddleware extends \Spatie\Permission\Middleware\PermissionMiddleware
{

  public function handle(Request $request, Closure $next, $permission, ?string $guard = null)
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

    if (! method_exists($user, 'hasAnyPermission')) {
      throw UnauthorizedException::missingTraitHasRoles($user);
    }

    $permissions = explode('|', self::parsePermissionsToString($permission));

    if (! $user->canAny($permissions)) {
      $exception = UnauthorizedException::forPermissions($permissions);

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
