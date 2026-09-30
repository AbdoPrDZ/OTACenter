<?php

namespace App\Models;

use App\Src\Model;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Storage;

#[Fillable([ 'name', 'disk', 'path' ])]
#[Hidden([ 'path', 'created_at', 'updated_at' ])]
class File extends Model
{
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
    $role = $user?->role || 'user';

    $data = [
      'name' => $this->name,
      'url'  => $this->url,
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
