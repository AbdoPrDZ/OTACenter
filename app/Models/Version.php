<?php

namespace App\Models;

use App\Src\Model;
use App\Src\ValidationType;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable(['app_id', 'name', 'client_type', 'changelog', 'status', 'is_demo', 'promoted_at', 'update_type', 'file_id', 'api_key', 'default_bundle_version', 'latest_id', 'demo_latest_id'])]
class Version extends Model
{
  /** Client families a version can be built for. */
  public const CLIENT_OTA = 'ota-client';
  public const CLIENT_EXPO = 'expo';

  protected $casts = [
    'is_demo'     => 'boolean',
    'promoted_at' => 'datetime',
  ];

  public function app()
  {
    return $this->belongsTo(App::class);
  }

  public function file()
  {
    return $this->belongsTo(File::class, 'file_id', 'name');
  }

  public function latest()
  {
    return $this->belongsTo(Bundle::class, 'latest_id', 'id');
  }

  /** The demo bundle, served only to devices that pass `DemoAccess`. */
  public function demoLatest()
  {
    return $this->belongsTo(Bundle::class, 'demo_latest_id', 'id');
  }

  public function isExpo(): bool
  {
    return $this->client_type === self::CLIENT_EXPO;
  }

  public function bundles()
  {
    return $this->hasMany(Bundle::class, 'version_id', 'id');
  }

  public function toArray(): array
  {
    $user = request()->user();
    $role = $user?->role ?? 'user';

    $data = [
      'id'         => $this->id,
      'app_id'     => $this->app_id,
      'name'       => $this->name,
      'client_type' => $this->client_type,
      'changelog'  => $this->changelog,
      'status'     => $this->status,
      'is_demo'    => $this->is_demo,
      'promoted_at' => $this->promoted_at,
      'update_type' => $this->update_type,
      'latest_id'  => $this->latest_id,
      'latest'     => $this->latest?->toArray(),
      'demo_latest_id' => $this->demo_latest_id,
      'demo_latest'    => $this->demoLatest?->toArray(),
      'default_bundle_version' => $this->default_bundle_version,
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
          'api_key'      => $this->api_key,
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
   * @param Version|null $record
   * @return array<string, mixed>
   */
  public static function validationRules(ValidationType $type, ?Model $record = null): array {

    if ($type == ValidationType::Update && $record === null) {
      throw new \InvalidArgumentException('Record must be provided for update validation');
    }

    if ($record && !($record instanceof self)) {
      throw new \InvalidArgumentException('Record must be an instance of App or null');
    }

    return match ($type) {
      ValidationType::Create => [
        'name'         => 'required|string|max:255',
        'client_type'  => 'sometimes|string|in:ota-client,expo',
        'changelog'    => 'required|string',
        # An Expo build may ship through a store, so its installer is optional.
        'file'         => 'required_unless:client_type,expo|nullable|file|extensions:apk|max:102400',
        'is_demo'      => 'sometimes|boolean',
        'status'       => 'sometimes|nullable|string|in:draft,review,published,cancelled',
        'update_type'  => 'sometimes|nullable|string|in:optional,force',
        'api_key'      => 'required|string|max:255',
        'latest_id'    => 'nullable|exists:bundles,id',
        'default_bundle_version' => 'nullable|string|max:255',
      ],
      ValidationType::Update => [
        'name'      => 'sometimes|required|string|max:255',
        'client_type' => 'sometimes|string|in:ota-client,expo',
        'changelog' => 'sometimes|required|string',
        'file'      => 'sometimes|required|file|extensions:apk|max:102400',
        'status'    => 'sometimes|nullable|string|in:draft,review,published,cancelled',
        'update_type' => 'sometimes|nullable|string|in:optional,force',
        'api_key'   => 'sometimes|required|string|max:255',
        'latest_id' => 'sometimes|nullable|exists:bundles,id',
        'default_bundle_version' => 'sometimes|nullable|string|max:255',
      ],
    };
  }
}
