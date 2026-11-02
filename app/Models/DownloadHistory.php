<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * One download of a version/bundle. `user_id` is who it counts for; it is set
 * from the token's user when the download came through a `DownloadLink`
 * (`download_link_id`), and null for anonymous downloads.
 */
#[Fillable(['device_id', 'user_id', 'download_link_id', 'target_id', 'target_type'])]
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

  public function downloadLink()
  {
    return $this->belongsTo(DownloadLink::class, 'download_link_id', 'id');
  }

  public function target()
  {
    return $this->morphTo('target', 'target_type','target_id');
  }
}
