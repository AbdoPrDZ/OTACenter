<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model as EloquentModel;

/**
 * One file of an Expo bundle (`npx expo export` output) for one platform.
 *
 * `hash` is the base64url SHA-256 that expo-updates verifies after download,
 * `key` the MD5 hex it uses to deduplicate files on the device.
 */
#[Fillable(['bundle_id', 'platform', 'source_path', 'path', 'key', 'hash', 'content_type', 'file_extension', 'is_launch_asset', 'size'])]
class BundleAsset extends EloquentModel
{
  public const PLATFORMS = ['android', 'ios'];

  protected $casts = [
    'is_launch_asset' => 'boolean',
    'size'            => 'integer',
  ];

  public function bundle()
  {
    return $this->belongsTo(Bundle::class);
  }

  public function toArray(): array
  {
    return [
      'id'              => $this->id,
      'platform'        => $this->platform,
      'source_path'     => $this->source_path,
      'content_type'    => $this->content_type,
      'file_extension'  => $this->file_extension,
      'is_launch_asset' => $this->is_launch_asset,
      'size'            => $this->size,
      'hash'            => $this->hash,
    ];
  }
}
