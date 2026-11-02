<?php

namespace App\Auth;

use Illuminate\Http\Request;
use Laravel\Sanctum\Guard as SanctumGuard;

class QueryOrHeaderSanctumGuard extends SanctumGuard
{
  protected function getTokenFromRequest(Request $request)
  {
    return parent::getTokenFromRequest($request);
  }
}
