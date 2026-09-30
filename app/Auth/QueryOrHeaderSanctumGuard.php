<?php

namespace App\Auth;

use Illuminate\Http\Request;
use Laravel\Sanctum\Guard as SanctumGuard;

class QueryOrHeaderSanctumGuard extends SanctumGuard
{
  protected function getTokenFromRequest(Request $request)
  {
    $token = parent::getTokenFromRequest($request) ?: $request->query('token');
    \Log::info("QueryOrHeaderSanctumGuard: token from request: $token");
    return $token;
  }
}
