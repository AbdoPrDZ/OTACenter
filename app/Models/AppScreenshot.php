<?php

namespace App\Models;

use App\Models\Traits\Tabling;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['app_id', 'file_id'])]
class AppScreenshot extends Model
{
  use Tabling;

  public function app()
  {
    return $this->belongsTo(App::class, 'app_id', 'id');
  }

  public function file()
  {
    return $this->belongsTo(File::class, 'file_id', 'name');
  }
}
