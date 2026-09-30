<?php

namespace App\Models;

use App\Models\Traits\Tabling;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['user_id', 'domain_id'])]
class UserDomain extends Model
{
  use Tabling;

  public function user()
  {
    return $this->belongsTo(User::class);
  }

  public function domain()
  {
    return $this->belongsTo(Domain::class);
  }

}
