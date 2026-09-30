<?php

namespace App\Models;

use App\Models\Traits\Tabling;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;
use Laravel\Sanctum\NewAccessToken;

#[Fillable(['did', 'user_id', 'manufacturer', 'brand', 'model', 'android_version', 'sdk_version'])]
class Device extends Authenticatable
{
  use HasApiTokens, SoftDeletes, Tabling;

  public function user()
  {
    return $this->belongsTo(User::class, 'user_id', 'id');
  }

  public function apps()
  {
    return $this->belongsToMany(App::class, 'device_apps', 'device_id', 'app_id')->withPivot('version_id', 'bundle_id')->withTimestamps();
  }

  /**
   * Create a new personal access token for the user.
   *
   * @param  string  $name
   * @param  array  $abilities
   * @param  array  $data
   * @param  DateTimeInterface|null  $expiresAt
   * @return NewAccessToken
   */
  public function createToken(string $name, array $abilities = ['*'], $data = [], ?DateTimeInterface $expiresAt = null)
  {
    $plainTextToken = sprintf(
      '%s%s%s',
      config('sanctum.token_prefix', ''),
      $tokenEntropy = Str::random(40),
      hash('crc32b', $tokenEntropy)
    );

    $token = $this->tokens()->create([
      'name'       => $name,
      'token'      => hash('sha256', $plainTextToken),
      'abilities'  => $abilities,
      'data'       => $data,
      'expires_at' => $expiresAt,
    ]);

    return new NewAccessToken($token, "$token->id|$plainTextToken");
  }
}
