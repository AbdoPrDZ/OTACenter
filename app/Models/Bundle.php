<?php

namespace App\Models;

use App\Src\Model;
use App\Src\ValidationType;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable(['version_id', 'name', 'changelog', 'status', 'update_type', 'file_id', 'is_demo', 'promoted_at', 'expo_update_id', 'expo_metadata'])]
class Bundle extends Model
{
  protected $filterable = ['name'];

  protected $casts = [
    'is_demo'       => 'boolean',
    'promoted_at'   => 'datetime',
    'expo_metadata' => 'array',
  ];

  public function version()
  {
    return $this->belongsTo(Version::class, 'version_id', 'id');
  }

  public function file()
  {
    return $this->belongsTo(File::class, 'file_id', 'name');
  }

  /** Files of an Expo bundle (`npx expo export`), one row per platform and file. */
  public function assets()
  {
    return $this->hasMany(BundleAsset::class, 'bundle_id', 'id');
  }

  public function isExpo(): bool
  {
    return $this->expo_update_id !== null;
  }

  /** Platforms an Expo bundle ships for (empty for an `ota-client` archive). */
  public function platforms(): array
  {
    if (!$this->isExpo()) return [];

    return $this->assets()->distinct()->orderBy('platform')->pluck('platform')->all();
  }

  public function hasPlatform(string $platform): bool
  {
    return $this->assets()->where('platform', $platform)->where('is_launch_asset', true)->exists();
  }

  public function toArray(): array
  {
    $user = request()->user();
    $role = $user?->role ?? 'user';

    $data = [
      'id'         => $this->id,
      'version_id' => $this->version_id,
      'name'       => $this->name,
      'changelog'  => $this->changelog,
      'status'     => $this->status,
      'update_type' => $this->update_type,
      'is_demo'    => $this->is_demo,
      'promoted_at' => $this->promoted_at,
      'platforms'  => $this->platforms(),
      'created_at' => $this->created_at,
    ];

    switch ($role) {
      case 'super-admin':
      case 'admin':
      case 'developer':
        $data = [
          ...$data,
          'file_id'    => $this->file_id,
          'url'        => $this->file?->url,
          'checksum'   => $this->file?->checksum,
          'expo_update_id' => $this->expo_update_id,
          'updated_at' => $this->updated_at,
        ];
        break;
      default:
        break;
    }

    return $data;
  }

  /**
   * Get the validation rules for the model based on the type and record.
   *
   * @param ValidationType $type
   * @param Bundle|null $record
   * @return array<string, mixed>
   */
  public static function validationRules(ValidationType $type, ?Model $record = null): array
  {
    if ($type == ValidationType::Update && $record === null) {
      throw new \InvalidArgumentException('Record must be provided for update validation');
    }

    if ($record && !($record instanceof self)) {
      throw new \InvalidArgumentException('Record must be an instance of Bundle or null');
    }

    return match ($type) {
      ValidationType::Create => [
        'name'      => 'required|string|max:255',
        'changelog' => 'nullable|string',
        'file'      => 'required|file|extensions:zip,tar,gz,tgz|max:102400',
        'status'    => 'sometimes|nullable|string|in:draft,review,published,cancelled',
        'update_type' => 'sometimes|nullable|string|in:optional,force',
        'is_demo'   => 'sometimes|boolean',
        # Expo uploads: the runtime the export was built for (checked against the version name).
        'runtime_version' => 'sometimes|nullable|string|max:255',
      ],
      ValidationType::Update => [
        'name'      => 'sometimes|required|string|max:255',
        'changelog' => 'sometimes|nullable|string',
        'file'      => 'sometimes|required|file|extensions:zip,tar,gz,tgz|max:102400',
        'status'    => 'sometimes|nullable|string|in:draft,review,published,cancelled',
        'update_type' => 'sometimes|nullable|string|in:optional,force',
      ],
    };
  }
}
