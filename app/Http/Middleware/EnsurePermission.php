<?php

namespace App\Http\Middleware;

use App\Src\Controller;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePermission
{
  /**
   * Check that the authenticated user has the given permission.
   *
   * Resolves the user from the request (guard sanctum, set by auth:sanctum)
   * instead of Spatie's default guard (web), then delegates to Spatie's
   * hasPermissionTo(). super-admin bypasses every check.
   *
   * Signature: permission:{permission-name}
   * Example:   permission:domain.create
   */
  public function handle(Request $request, Closure $next, string $permission): Response
  {
    $user = $request->user();

    if (!$user)
      return Controller::apiErrorResponse("Unauthenticated", code: 401);

    if ($user->hasRole('super-admin'))
      return $next($request);

    if (!$user->hasPermissionTo($permission))
      return Controller::apiErrorResponse("Forbidden", code: 403);

    return $next($request);
  }
}
