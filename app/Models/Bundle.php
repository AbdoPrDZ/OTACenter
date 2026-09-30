<?php

namespace App\Models;

use App\Src\Model;
use App\Src\ValidationType;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable(['version_id', 'name', 'changelog', 'status', 'file_id'])]
class Bundle extends Model
{
  protected $filterable = ['name'];

  public function version()
  {
    return $this->belongsTo(Version::class, 'version_id', 'id');
  }

  public function file()
  {
    return $this->belongsTo(File::class, 'file_id', 'name');
  }

  public function toArray(): array
  {
    $user = request()->user();
    $role = $user?->role || 'user';

    $data = [
      'id'         => $this->id,
      'version_id' => $this->version_id,
      'name'       => $this->name,
      'changelog'  => $this->changelog,
      'status'     => $this->status,
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
        'file'      => 'required|file|extensions:zip|max:102400',
        'status'    => 'sometimes|nullable|string|in:draft,review,published,cancelled',
      ],
      ValidationType::Update => [
        'name'      => 'sometimes|required|string|max:255',
        'changelog' => 'sometimes|nullable|string',
        'file'      => 'sometimes|required|file|extensions:zip|max:102400',
        'status'    => 'sometimes|nullable|string|in:draft,review,published,cancelled',
      ],
    };
  }
}
