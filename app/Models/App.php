<?php

namespace App\Models;

use App\Src\Model;
use App\Src\ValidationType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['name', 'package_name', 'summary', 'description', 'logo_id', 'latest_id', 'status' ])]
class App extends Model
{
  protected $appends = [ 'logo_url' ];

  protected $filterable = [ 'name', 'package_name', 'summary', 'description' ];

  public function logo()
  {
    return $this->belongsTo(File::class, 'logo_id', 'name');
  }

  public function screenshots(): BelongsToMany
  {
    return $this->belongsToMany(File::class, 'app_screenshots', 'app_id', 'file_id');
  }

  public function domains(): BelongsToMany
  {
    return $this->belongsToMany(Domain::class, 'app_domains', 'app_id', 'domain_id');
  }

  public function versions()
  {
    return $this->hasMany(Version::class, 'app_id', 'id');
  }

  public function latest()
  {
    return $this->belongsTo(Version::class, 'latest_id', 'id');
  }

  public function getLogoUrlAttribute()
  {
    return $this->logo?->url;
  }

  public function toArray(): array
  {
    $user = request()->user();
    $role = $user?->role || 'user';

    $data = [
      'id'           => $this->id,
      'name'         => $this->name,
      'package_name' => $this->package_name,
      'summary'      => $this->summary,
      'description'  => $this->description,
      'status'       => $this->status,
      'logo_url'     => $this->logo_url,
      'latest_id'    => $this->latest_id,
      'latest'       => $this->latest?->toArray(),
      'created_at'   => $this->created_at,
    ];

    switch ($role) {
      case 'super-admin':
      case 'admin':
      case 'developer':
        $data = [
          ...$data,
          'logo_id'    => $this->logo_id,
          'updated_at' => $this->updated_at,
          'domains'    => $this->domains->map(fn ($domain) => $domain->toArray()),
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
   * @param App|null $record
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
        'package_name' => 'required|string|max:255|unique:apps,package_name',
        'summary'      => 'nullable|string|max:255',
        'description'  => 'nullable|string',
        'status'       => 'sometimes|nullable|string|in:draft,review,published,cancelled',
        'logo'         => 'nullable|file|mimes:jpeg,png,jpg,gif,svg|max:2048',
      ],
      ValidationType::Update => [
        'name'         => 'sometimes|required|string|max:255',
        'package_name' => "sometimes|required|string|max:255|unique:apps,package_name,$record->id",
        'summary'      => 'sometimes|nullable|string|max:255',
        'description'  => 'sometimes|nullable|string',
        'status'       => 'sometimes|nullable|string|in:draft,review,published,cancelled',
        'latest_id'    => 'sometimes|nullable|exists:versions,id',
        'logo'         => 'sometimes|nullable|file|mimes:jpeg,png,jpg,gif,svg|max:2048',
      ],
    };
  }
}
