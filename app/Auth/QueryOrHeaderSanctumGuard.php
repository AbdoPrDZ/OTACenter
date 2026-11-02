<?php

namespace App\Auth;

use Illuminate\Http\Request;
use Laravel\Sanctum\Guard as SanctumGuard;

/**
 * Sanctum guard that reads the token from the `Authorization: Bearer` header only.
 *
 * Tokens are deliberately NOT accepted from the query string here: URLs end up in
 * server logs, browser history and `Referer` headers. The one endpoint that needs a
 * URL token (the store APK download a browser opens directly) resolves `?token=`
 * itself in `StoreController::resolveUser()`.
 */
class QueryOrHeaderSanctumGuard extends SanctumGuard
{
  protected function getTokenFromRequest(Request $request)
  {
    return parent::getTokenFromRequest($request);
  }
}
