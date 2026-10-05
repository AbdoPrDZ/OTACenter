<?php

namespace App\Models;

use App\Src\Model;
use App\Src\ValidationType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['name', 'description', 'is_public', 'image_id' ])]
class Domain extends Model
{
  protected $appends = [ 'image_url' ];

  protected $casts = [
    'is_public' => 'boolean',
  ];

  protected $filterable = [ 'name', 'description' ];

  public function image()
  {
    return $this->belongsTo(File::class, 'image_id', 'name');
  }

  public function getImageUrlAttribute()
  {
    return $this->image?->url;
  }

  public function toArray(): array
  {
    $user = request()->user();
    $role = $user?->role || 'user';

    $data = [
      'id'          => $this->id,
      'name'        => $this->name,
      'description' => $this->description,
      'is_public'   => $this->is_public,
      'image_url'   => $this->image_url,
      'created_at'  => $this->created_at,
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

  public function users(): BelongsToMany
  {
    return $this->belongsToMany(User::class, 'user_domains', 'domain_id', 'user_id');
  }

  public function apps(): BelongsToMany
  {
    return $this->belongsToMany(App::class, 'app_domains', 'domain_id', 'app_id');
  }

  /**
   * Get the validation rules for the model based on the type and record.
   *
   * @param ValidationType $type
   * @param Domain|null $record
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
        'description'  => 'nullable|string',
        'is_public'    => 'sometimes|boolean',
        'image'        => 'nullable|file|mimes:jpeg,png,jpg,gif,svg|max:2048',
      ],
      ValidationType::Update => [
        'name'         => 'sometimes|required|string|max:255',
        'summary'      => 'sometimes|nullable|string|max:255',
        'description'  => 'sometimes|nullable|string',
        'is_public'    => 'sometimes|boolean',
        'image'        => 'sometimes|nullable|file|mimes:jpeg,png,jpg,gif,svg|max:2048',
      ],
    };
  }
}
