<?php

namespace App\Models;

use App\Src\Model;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Storage;

#[Fillable([ 'name', 'disk', 'path', 'checksum' ])]
#[Hidden([ 'path', 'created_at', 'updated_at' ])]
class File extends Model
{
  /** Algorithm behind the `checksum` column. */
  public const CHECKSUM_ALGO = 'sha256';

  /**
   * Every new file gets the checksum of its stored content, whichever code path
   * created the row (uploads, base64 files, seeders). When the path changes the
   * checksum is recomputed. A row whose file is not on disk keeps `null`.
   */
  protected static function booted(): void
  {
    static::creating(function (File $file) {
      if (empty($file->checksum))
        $file->checksum = self::checksumOf($file->disk, $file->path);
    });

    static::updating(function (File $file) {
      if ($file->isDirty(['disk', 'path']) && !$file->isDirty('checksum'))
        $file->checksum = self::checksumOf($file->disk, $file->path);
    });
  }

  /**
   * SHA-256 (hex) of a stored file, or null when the disk or file does not exist.
   * Streams the file, so large APKs are not loaded into memory.
   */
  public static function checksumOf(?string $disk, ?string $path): ?string
  {
    if (!$path) return null;

    try {
      $storage = Storage::disk($disk ?: 'public');

      if (!$storage->exists($path)) return null;

      $hash = hash_file(self::CHECKSUM_ALGO, $storage->path($path));

      return $hash === false ? null : $hash;
    } catch (\Throwable) {
      # Unknown disk (the `admin`/`api` enum values have no configured disk).
      return null;
    }
  }

  /** Download response headers advertising the checksum (empty when unknown). */
  public function checksumHeaders(): array
  {
    return $this->checksum ? ['X-Checksum-SHA256' => $this->checksum] : [];
  }

  /** Recompute and save the checksum from the stored file. */
  public function refreshChecksum(): ?string
  {
    $this->checksum = self::checksumOf($this->disk, $this->path);
    $this->save();

    return $this->checksum;
  }
  public $incrementing = false;

  protected $primaryKey = 'name';

  protected $keyType = 'string';

  protected $casts = [
    'name' => 'string',
  ];

  protected $appends = [
    'url',
  ];

  // TODO: Enable event and create listener to delete file from storage
  // protected $dispatchesEvents = [
  //   'deleted' => FileDeletedEvent::class,
  // ];

  public function getUrlAttribute()
  {
    return request()->getSchemeAndHttpHost() . "/files/$this->name";
  }

  public function getBase64Attribute()
  {
    $content = Storage::disk($this->disk)->get($this->path);
    $base64  = base64_encode($content);
    return $base64;
  }

  public function toArray(): array
  {
    $user = request()->user();
    $role = $user?->role ?? 'user';

    $data = [
      'name'     => $this->name,
      'url'      => $this->url,
      'checksum' => $this->checksum,
    ];

    switch ($role) {
      case 'super-admin':
      case 'admin':
      case 'developer':
        $data = [
          ...$data,
          'disk'       => $this->disk,
          'path'       => $this->path,
          'created_at' => $this->created_at,
          'updated_at' => $this->updated_at,
        ];
        break;
      default:
        break;
    }

    return $this->mergeArrayableRelations($data);
  }
}
