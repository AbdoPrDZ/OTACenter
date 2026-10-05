<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['log_id', 'holder_type', 'holder_id'])]
class LogHolder extends Model
{
  public function log()
  {
    return $this->belongsTo(Log::class);
  }

  /**
   * The attached model (User, App, Version, Bundle, Device, Review…).
   */
  public function holder()
  {
    return $this->morphTo('holder', 'holder_type', 'holder_id');
  }

  /** Best-effort human label for the related model. */
  public function label(): ?string
  {
    $holder = $this->holder;

    if (!$holder) {
      return null;
    }

    return $holder->name ?? $holder->did ?? ('#' . $this->holder_id);
  }
}
