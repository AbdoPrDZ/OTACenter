<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
  /**
   * The URIs that should be excluded from CSRF verification.
   *
   * The JSON API lives in the `web` group so the dashboard SPA keeps its
   * session/CSRF flow, but native clients authenticate with a Sanctum bearer
   * token and cannot obtain a CSRF token. Only the token-auth endpoints are
   * exempted; every other state-changing route still requires CSRF.
   *
   * @var array<int, string>
   */
  protected $except = [
    'api/auth/login',
    'api/auth/logout',
    'api/auth/register',
    'api/auth/profile',
  ];

  /**
   * A request carrying a `Bearer` token is authenticated by that token, not by
   * a cookie session, so it cannot be forged from a browser and does not need a
   * CSRF token. This is how the mobile client talks to the API; the dashboard
   * SPA has no bearer token and keeps the normal cookie + CSRF flow.
   */
  protected function tokensMatch($request)
  {
    if ($request->bearerToken()) {
      return true;
    }

    return parent::tokensMatch($request);
  }
}
