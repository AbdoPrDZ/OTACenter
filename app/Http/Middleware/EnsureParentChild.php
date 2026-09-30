<?php

namespace App\Http\Middleware;

use App\Src\Controller;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class EnsureParentChild
{
  /**
   * Verify that the child record (route param) belongs to the parent record (route param).
   *
   * Signature: rec.parent:{parentParam}-{parentTable}-{parentColumn},{childParam}-{childTable}-{childColumn}
   *   parentParam/childParam  — route parameter names
   *   parentTable/childTable  — table names (used only when the param isn't route-model-bound)
   *   parentColumn            — parent column to compare (e.g. "id")
   *   childColumn             — child FK column (e.g. "app_id")
   *
   * Example: rec.parent:app-apps-id,version-versions-app_id
   */
  public function handle(Request $request, Closure $next, string $parentSpec, string $childSpec): Response
  {
    [$parentParam, $parentTable, $parentColumn] = explode('-', $parentSpec, 3);
    [$childParam, $childTable, $childColumn] = explode('-', $childSpec, 3);

    $parent = $this->resolve($request, $parentParam, $parentTable);
    $child = $this->resolve($request, $childParam, $childTable);

    if (!$parent || !$child || $child->{$childColumn} != $parent->{$parentColumn}) {
      return Controller::apiErrorResponse("Not found", code: 404);
    }

    return $next($request);
  }

  private function resolve(Request $request, string $param, string $table): mixed
  {
    $value = $request->route($param);

    if ($value instanceof Model)
      return $value;

    return DB::table($table)->where('id', $value)->first();
  }
}
