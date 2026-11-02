<?php

namespace App\Models;

use App\Models\Traits\Tabling;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * A shareable download link for an app (shown as a URL + QR code in the dashboard).
 *
 * The link's token is the grant: it downloads the app's current published build
 * whether the app is public or private, and every download through it is counted
 * against `user_id`. `token_hash` (SHA-256) is what requests are matched on; the
 * token itself is stored encrypted so the dashboard can show the link again.
 */
#[Fillable(['app_id', 'user_id', 'created_by', 'label', 'token_hash', 'token', 'expires_at', 'revoked_at', 'last_used_at'])]
#[Hidden(['token', 'token_hash'])]
class DownloadLink extends Model
{
  use Tabling;

  protected $sortable = ['id', 'label', 'created_at', 'expires_at', 'last_used_at'];

  protected $filterable = ['label'];

  protected function casts(): array
  {
    return [
      'token'        => 'encrypted',
      'expires_at'   => 'datetime',
      'revoked_at'   => 'datetime',
      'last_used_at' => 'datetime',
    ];
  }

  public function app()
  {
    return $this->belongsTo(App::class, 'app_id', 'id');
  }

  public function user()
  {
    return $this->belongsTo(User::class, 'user_id', 'id');
  }

  public function creator()
  {
    return $this->belongsTo(User::class, 'created_by', 'id');
  }

  public function downloads()
  {
    return $this->hasMany(DownloadHistory::class, 'download_link_id', 'id');
  }

  /**
   * Create a link for `$app`, counted against `$user`.
   */
  public static function generate(
    App $app,
    ?User $user,
    ?User $creator = null,
    ?DateTimeInterface $expiresAt = null,
    ?string $label = null,
  ): self {
    $token = Str::random(48);

    return self::create([
      'app_id'     => $app->id,
      'user_id'    => $user?->id,
      'created_by' => $creator?->id,
      'label'      => $label,
      'token_hash' => self::hash($token),
      'token'      => $token,
      'expires_at' => $expiresAt,
    ]);
  }

  public static function hash(string $token): string
  {
    return hash('sha256', $token);
  }

  public static function findByToken(?string $token): ?self
  {
    if (!is_string($token) || $token === '') return null;

    return self::where('token_hash', self::hash($token))->first();
  }

  public function isRevoked(): bool
  {
    return $this->revoked_at !== null;
  }

  public function isExpired(): bool
  {
    return $this->expires_at !== null && $this->expires_at->isPast();
  }

  public function isActive(): bool
  {
    return !$this->isRevoked() && !$this->isExpired();
  }

  /** Public download URL — the value encoded in the QR code. */
  public function url(): string
  {
    return route('apps.download', ['app' => $this->app_id, 'token' => $this->token]);
  }

  public function toArray(): array
  {
    return [
      'id'              => $this->id,
      'app_id'          => $this->app_id,
      'label'           => $this->label,
      'url'             => $this->url(),
      'status'          => $this->isRevoked() ? 'revoked' : ($this->isExpired() ? 'expired' : 'active'),
      'user'            => $this->user ? [
        'id'    => $this->user->id,
        'name'  => $this->user->name,
        'login' => $this->user->login,
      ] : null,
      'creator'         => $this->creator ? [
        'id'   => $this->creator->id,
        'name' => $this->creator->name,
      ] : null,
      'downloads_count' => (int) ($this->downloads_count ?? $this->downloads()->count()),
      'expires_at'      => $this->expires_at,
      'revoked_at'      => $this->revoked_at,
      'last_used_at'    => $this->last_used_at,
      'created_at'      => $this->created_at,
    ];
  }
}
