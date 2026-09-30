<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['device_id', 'user_id', 'target_id', 'target_type'])]
class DownloadHistory extends Model
{

  public function device()
  {
    return $this->belongsTo(Device::class, 'device_id', 'id');
  }

  public function user()
  {
    return $this->belongsTo(User::class, 'user_id', 'id');
  }

  public function target()
  {
    return $this->morphTo('target', 'target_type','target_id');
  }

}
