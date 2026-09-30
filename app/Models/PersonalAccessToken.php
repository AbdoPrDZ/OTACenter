<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;

#[Fillable(['name', 'token', 'data', 'abilities', 'expires_at'])]
class PersonalAccessToken extends SanctumPersonalAccessToken
{
  /**
   * The attributes that should be cast to native types.
   *
   * @var array
   */
  protected $casts = [
    'data'         => 'json',
    'abilities'    => 'json',
    'last_used_at' => 'datetime',
    'expires_at'   => 'datetime',
  ];
}
