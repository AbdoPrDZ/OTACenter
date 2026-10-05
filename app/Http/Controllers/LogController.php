<?php

namespace App\Http\Controllers;

use App\Models\App;
use App\Models\Log;
use App\Models\User;
use App\Src\Controller;
use Illuminate\Http\Request;

class LogController extends Controller
{
  /** Global activity log (dashboard). */
  public function index(Request $request)
  {
    $request->mergeIfMissing(['page' => 1, 'pageSize' => 20]);

    return Log::tablingCollect(
      $request,
      load: ['holders.holder'],
      selects: ['logs.*'],
    );
  }

  /** Activity for one app. */
  public function indexByApp(Request $request, App $app)
  {
    $request->mergeIfMissing(['page' => 1, 'pageSize' => 20]);

    return Log::tablingCollect(
      $request,
      load: ['holders.holder'],
      selects: ['logs.*'],
      query: $this->forHolder(App::class, $app->id),
    );
  }

  /** Activity for one user. */
  public function indexByUser(Request $request, User $user)
  {
    $request->mergeIfMissing(['page' => 1, 'pageSize' => 20]);

    return Log::tablingCollect(
      $request,
      load: ['holders.holder'],
      selects: ['logs.*'],
      query: $this->forHolder(User::class, $user->id),
    );
  }

  private function forHolder(string $type, int $id)
  {
    return Log::query()->whereHas(
      'holders',
      fn ($query) => $query->where('holder_type', $type)->where('holder_id', $id),
    );
  }
}
