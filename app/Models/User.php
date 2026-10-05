<?php

namespace App\Models;

use App\Models\Traits\Tabling;
use App\Src\Model;
use App\Src\ValidationType;
use Database\Factories\UserFactory;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Laravel\Sanctum\NewAccessToken;
use LdapRecord\Laravel\Auth\AuthenticatesWithLdap;
use LdapRecord\Laravel\Auth\LdapAuthenticatable;
use Spatie\Permission\Traits\HasRoles;
use Str;

#[Fillable(['name', 'login', 'password', 'image_id'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements LdapAuthenticatable
{
  /** @use HasFactory<UserFactory> */
  use HasRoles, AuthenticatesWithLdap, Notifiable, HasFactory, HasApiTokens, Tabling, SoftDeletes;

  /**
   * Get the attributes that should be cast.
   *
   * @return array<string, string>
   */
  protected function casts(): array
  {
    return [
      'password' => 'hashed',
    ];
  }

  /**
   * Override to prevent password checking since we don't store passwords
   */
  public function getAuthPassword()
  {
    // throw new \Exception('Password authentication is disabled for LDAP users');
    return null;
  }

  /**
   * Override to prevent password checking
   */
  public function getAuthPasswordName()
  {
    return null;
  }

  protected $appends = [
    'image_url',
    'role'
  ];

  public function image()
  {
    return $this->belongsTo(File::class, 'image_id', 'name');
  }

  public function getRoleAttribute(): string
  {
    $roles = ['super-admin', 'admin', 'developer', 'user'];
    $user_roles = $this->getRoleNames()->toArray();

    foreach ($roles as $role)
      if (in_array($role, $user_roles))
        return $role;

    return 'user';
  }

  public function getImageUrlAttribute(): ?string
  {
    return $this->image?->url;
  }

  public function toArray(): array
  {
    $user = request()->user();
    $role = $user?->role || 'user';

    $data = [
      'id'         => $this->id,
      'name'       => $this->name,
      'login'      => $this->login,
      'image_url'  => $this->image_url,
      'role'       => $this->role,
      'created_at' => $this->created_at,
    ];

    switch ($role) {
      case 'super-admin':
      case 'admin':
      case 'developer':
        $data = [
          ...$data,
          'image_id'   => $this->image_id,
          'updated_at' => $this->updated_at,
        ];
        break;
      default:
        break;
    }

    return $this->mergeArrayableRelations($data);
  }

  public function domains(): BelongsToMany
  {
    return $this->belongsToMany(Domain::class, 'user_domains', 'user_id', 'domain_id');
  }

  /**
   * Get the validation rules for creating or updating a record.
   *
   * @param ValidationType $type
   * @param Model|null $record
   * @return array<string, mixed>
   * @throws \InvalidArgumentException if $type is Update and $record is null
   */
  public static function validationRules(ValidationType $type, ?User $record = null): array
  {
    if ($type === ValidationType::Update && $record === null) {
      throw new \InvalidArgumentException('Record must not be null when updating.');
    }

    return match ($type) {
      ValidationType::Update => [
        'name'        => 'sometimes|required|string|max:255',
        'image'       => 'nullable|file|mimes:jpeg,png,jpg,bmp,svg|max:4096',
      ],
    };
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
