<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model as EloquentModel;
use Illuminate\Support\Str;

/**
 * A short-lived, one-time code that links a device to a user.
 *
 * The device API is anonymous (API key only), so this is how the server learns
 * whose device it is — which is what demo eligibility depends on. Only the
 * SHA-256 of the code is stored.
 */
#[Fillable(['user_id', 'app_id', 'created_by', 'code_hash', 'expires_at', 'used_at', 'device_id'])]
class DeviceLinkCode extends EloquentModel
{
  /** No 0/O/1/I/L, so a code read off a screen is typed correctly. */
  private const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  public const LENGTH = 8;
  public const DEFAULT_TTL_MINUTES = 15;
  public const MAX_TTL_MINUTES = 1440;

  protected $casts = [
    'expires_at' => 'datetime',
    'used_at'    => 'datetime',
  ];

  public function user()
  {
    return $this->belongsTo(User::class);
  }

  public function app()
  {
    return $this->belongsTo(App::class);
  }

  public function device()
  {
    return $this->belongsTo(Device::class);
  }

  /**
   * Creates a code and returns `[record, plainCode]`. The plain code is shown
   * once; only its hash is kept.
   *
   * @return array{0: self, 1: string}
   */
  public static function issue(User $user, ?App $app, ?User $creator, int $ttlMinutes = self::DEFAULT_TTL_MINUTES): array
  {
    do {
      $code = '';
      for ($i = 0; $i < self::LENGTH; $i++)
        $code .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
    } while (static::where('code_hash', self::hash($code))->exists());

    $record = static::create([
      'user_id'    => $user->id,
      'app_id'     => $app?->id,
      'created_by' => $creator?->id,
      'code_hash'  => self::hash($code),
      'expires_at' => now()->addMinutes($ttlMinutes),
    ]);

    return [$record, $code];
  }

  /** Normalizes user input (case, spaces, dashes) before hashing. */
  public static function hash(string $code): string
  {
    $normalized = strtoupper(preg_replace('/[\s-]+/', '', $code));

    return hash('sha256', $normalized);
  }

  /** The usable code matching `$code` for `$app`, or null. */
  public static function findUsable(string $code, App $app): ?self
  {
    return static::where('code_hash', self::hash($code))
      ->whereNull('used_at')
      ->where('expires_at', '>', now())
      ->where(fn ($q) => $q->whereNull('app_id')->orWhere('app_id', $app->id))
      ->first();
  }

  public function toArray(): array
  {
    return [
      'id'         => $this->id,
      'user_id'    => $this->user_id,
      'app_id'     => $this->app_id,
      'expires_at' => $this->expires_at,
      'used_at'    => $this->used_at,
      'device_id'  => $this->device_id,
      'created_at' => $this->created_at,
    ];
  }
}
