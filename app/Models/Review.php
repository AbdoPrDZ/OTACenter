<?php

namespace App\Models;

use App\Src\Model;
use App\Src\ValidationType;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable(['app_id', 'user_id', 'device_id', 'rating', 'title', 'comment', 'status'])]
class Review extends Model
{
  protected $filterable = ['title', 'comment'];

  public function app()
  {
    return $this->belongsTo(App::class);
  }

  public function user()
  {
    return $this->belongsTo(User::class);
  }

  public function device()
  {
    return $this->belongsTo(Device::class);
  }

  public function toArray(): array
  {
    $user = request()->user();
    $role = $user?->role || 'user';

    $data = [
      'id'         => $this->id,
      'app_id'     => $this->app_id,
      'user_id'    => $this->user_id,
      'rating'     => (int) $this->rating,
      'title'      => $this->title,
      'comment'    => $this->comment,
      'status'     => $this->status,
      'created_at' => $this->created_at,
      'user'       => $this->user ? [
        'id'        => $this->user->id,
        'name'      => $this->user->name,
        'login'     => $this->user->login,
        'image_url' => $this->user->image_url,
      ] : null,
    ];

    if ($this->relationLoaded('app') && $this->app) {
      $data['app'] = [
        'id'           => $this->app->id,
        'name'         => $this->app->name,
        'package_name' => $this->app->package_name,
        'logo_url'     => $this->app->logo_url,
      ];
    }

    switch ($role) {
      case 'super-admin':
      case 'admin':
      case 'developer':
        $data = [
          ...$data,
          'device_id'  => $this->device_id,
          'updated_at' => $this->updated_at,
        ];
        break;

      default:
        break;
    }

    return $this->mergeArrayableRelations($data);
  }

  /**
   * Get the validation rules for the model based on the type and record.
   *
   * @param ValidationType $type
   * @param Model|null $record
   * @return array<string, mixed>
   */
  public static function validationRules(ValidationType $type, ?Model $record = null): array
  {
    if ($record && !($record instanceof self)) {
      throw new \InvalidArgumentException('Record must be an instance of Review or null');
    }

    return match ($type) {
      ValidationType::Create => [
        'rating'  => 'required|integer|min:1|max:5',
        'title'   => 'nullable|string|max:255',
        'comment' => 'nullable|string|max:2000',
      ],
      ValidationType::Update => [
        'rating'  => 'sometimes|required|integer|min:1|max:5',
        'title'   => 'sometimes|nullable|string|max:255',
        'comment' => 'sometimes|nullable|string|max:2000',
      ],
    };
  }
}
