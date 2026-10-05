<?php

namespace App\Models;

use App\Models\Traits\Tabling;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * An append-only activity record.
 *
 * A single log can be attached to several models (a user, an app, a version, a
 * bundle, a device…) through {@see LogHolder}, so queries like "everything that
 * happened to this app" or "everything this user did" are plain relations.
 */
#[Fillable(['event', 'message', 'meta', 'ip'])]
class Log extends Model
{
  use Tabling;

  protected $filterable = ['event', 'message'];

  protected $casts = [
    'meta' => 'array',
  ];

  public function holders()
  {
    return $this->hasMany(LogHolder::class);
  }

  public function toArray(): array
  {
    return [
      'id'         => $this->id,
      'event'      => $this->event,
      'message'    => $this->message,
      'meta'       => $this->meta,
      'ip'         => $this->ip,
      'holders'    => $this->holders->map(fn (LogHolder $holder) => [
        'type'  => class_basename($holder->holder_type),
        'id'    => $holder->holder_id,
        'label' => $holder->label(),
      ])->values(),
      'created_at' => $this->created_at,
      'updated_at' => $this->updated_at,
    ];
  }

  /**
   * Record a log entry and attach it to the given models.
   *
   * @param array<int, \Illuminate\Database\Eloquent\Model> $holders
   */
  public static function record(
    string $event,
    ?string $message = null,
    array $holders = [],
    ?array $meta = null,
    ?string $ip = null,
  ): self {
    $log = static::create([
      'event'   => $event,
      'message' => $message,
      'meta'    => $meta,
      'ip'      => $ip ?? request()->ip(),
    ]);

    foreach ($holders as $holder) {
      if (!$holder instanceof Model) {
        continue;
      }

      $log->holders()->create([
        'holder_type' => get_class($holder),
        'holder_id'   => $holder->getKey(),
      ]);
    }

    return $log;
  }
}
