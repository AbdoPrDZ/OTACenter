<?php

namespace App\Models;

use App\Models\Traits\Tabling;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['app_id', 'domain_id'])]
class AppDomain extends Model
{
  use Tabling;

  public function app()
  {
    return $this->belongsTo(App::class);
  }

  public function domain()
  {
    return $this->belongsTo(Domain::class);
  }

}
