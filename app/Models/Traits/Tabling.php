<?php

namespace App\Models\Traits;

use App\Src\Controller;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Validator;

/**
 * A trait to handle tabling of models
 *
 * @package App\Models\Traits
 * @property array|null $sortable The fields that can be sorted
 * @property array|null $filterable The fields that can be filtered
 * @property array|null $tablingRules The rules for tabling
 */
trait Tabling
{

  /**
   * Get the fields that can be sorted
   *
   * @param \Illuminate\Database\Eloquent\Model|null $_this The instance of the model if available
   *
   * @return array
   */
  private function getSortFields($_this = null): array
  {
    $_this ??= $this;
    return $_this->sortable ?? $_this->fillable ?? [];
  }

  /**
   * Get the fields that can be filtered
   *
   * @param \Illuminate\Database\Eloquent\Model|null $_this The instance of the model if available
   *
   * @return array
   */
  private function getFilterFields($_this = null): array
  {
    $_this ??= $this;
    return $_this->filterable ?? [];
  }

  /**
   * Merge the model's loaded (arrayable) relations into a serialized array.
   *
   * @param array $data
   * @return array
   */
  public function mergeArrayableRelations(array $data): array
  {
    foreach ($this->getArrayableRelations() as $key => $value) {
      if (is_array($value) || $value instanceof \Illuminate\Contracts\Support\Arrayable)
        $data[$key] = $value->toArray();
      elseif ($value instanceof \JsonSerializable)
        $data[$key] = $value->jsonSerialize();
      else
        $data[$key] = $value;
    }

    return $data;
  }

  /**
   * Get the rules for tabling
   *
   * @param \Illuminate\Database\Eloquent\Model|null $_this The instance of the model if available
   *
   * @return array
   */
  private function getRules($_this = null): array
  {
    $_this ??= $this;

    $rules = [
      'page'     => 'required|integer|min:1',
      'pageSize' => 'nullable|integer|min:5',
      'search'   => 'nullable|string',
    ];

    $rules['sort'] = 'nullable|array';
    foreach ($_this->getSortFields($_this) as $k => $v)
      $rules['sort.' . (is_numeric($k) ? $v : $k)] = 'nullable|in:asc,desc';

    $rules['filter'] = 'nullable|array';
    foreach ($_this->getFilterFields($_this) as $k => $v)
      $rules['filter.' . (is_numeric($k) ? $v : $k)] = 'nullable:string';

    return $rules;
  }

  /**
   * Get all the rules for tabling
   *
   * @param \Illuminate\Database\Eloquent\Model|null $_this The instance of the model if available
   *
   * @return array
   */
  private function getAllRules($_this = null): array
  {
    $_this ??= $this;
    return array_merge($_this->getRules($_this), $_this->tablingRules ?? []);
  }

  /**
   * Get the query with joins
   *
   * @param \Illuminate\Database\Eloquent\Model|null $_this The instance of the model if available
   * @param string|array $relations The relations to join
   * @param array $joins The joins to add
   * @param \Illuminate\Database\Query\Builder|\Illuminate\Database\Eloquent\Builder $query The query to add the joins to
   *
   * @return \Illuminate\Database\Query\Builder|\Illuminate\Database\Eloquent\Builder
   */
  private function withJoins(
    QueryBuilder|EloquentBuilder $query,
    $_this = null,
    string|array $relations = [],
    array $joins = [],
  ): QueryBuilder|EloquentBuilder {
    $_this ??= $this;

    $relations = is_array($relations) ? $relations : [$relations];

    foreach ($relations as $name) {
      if (!method_exists($_this, $name))
        throw new \Exception("Method $name does not exist");

      /**
       * @var \Illuminate\Database\Eloquent\Relations\Relation $relation
       */
      $relation = $_this->{$name}();

      $table = $relation->getModel()->getTable() . ' as ' . $relation->getRelationName();
      $first =
        $relation->getRelationName() . "." .
        explode('.', $relation->getRelated()->getQualifiedKeyName())[1];
      $second = $relation->getQualifiedForeignKeyName();

      $query->leftJoin($table, $first, '=', $second);
    }

    foreach ($joins as $join)
      $query->leftJoin(...$join);

    return $query;
  }

  /**
   * Get the tabling query
   *
   * @param \Illuminate\Database\Eloquent\Model|null $_this The instance of the model if available
   * @param \Illuminate\Http\Request $request The request to get the data from
   * @param string|array $relations The relations to join
   * @param \Illuminate\Database\Query\Builder|\Illuminate\Database\Eloquent\Builder|null $query The query to add the joins to
   * @param array $joins The joins to add
   *
   * @return \Illuminate\Database\Query\Builder|\Illuminate\Database\Eloquent\Builder
   */
  private function getTablingQuery(
    Request $request,
    $_this = null,
    string|array $relations = [],
    QueryBuilder|EloquentBuilder|null $query = null,
    array $joins = [],
  ): QueryBuilder|EloquentBuilder {
    $_this ??= $this;

    $query = $query ?? self::query();

    $query = $_this->withJoins(
      _this: $_this,
      relations: $relations,
      joins: $joins,
      query: $query,
    );

    if ($request->sort)
      foreach ($_this->getSortFields($_this) as $key => $value) {
        if (is_numeric($key)) {
          $field = $value;
          $column = $value;
        } else {
          $field = $key;
          $column = $value;
        }

        /**
         * @var \Illuminate\Support\Collection<string, string> $sort
         */
        $sort = collect($request->get("sort"));

        if ($fieldSort = $sort->get($field))
          $query->orderBy($column, $fieldSort);
      }

    if ($request->filter || $request->search) {
      $query = $query->where(function ($query) use ($_this, $request) {
        $search = $request->search;

        foreach ($_this->getFilterFields($_this) as $key => $value) {
          if (is_numeric($key)) {
            $field = $value;
            $column = $value;
          } else {
            $field = $key;
            $column = $value;
          }

          /**
           * @var \Illuminate\Support\Collection<string, string> $filter
           */
          $filter = collect($request->get("filter") ?? []);

          if ($search) {
            $query->orWhere($column, 'like', "%$search%");
          } else if ($fieldFilter = $filter->get($field))
            $query->orWhere($column, 'like', "%$fieldFilter%");
        }
      });
    }

    return $query;
  }

  /**
   * Get the paginate instance
   *
   * @param \Illuminate\Database\Eloquent\Model|null $_this The instance of the model if available
   * @param int $pageSize The page size
   * @param int $page The page number
   * @param \Illuminate\Database\Query\Builder|\Illuminate\Database\Eloquent\Builder $query The query to paginate
   *
   * @return \Illuminate\Pagination\LengthAwarePaginator
   */
  private function getPaginate(
    int $pageSize,
    int $page,
    QueryBuilder|EloquentBuilder $query,
    $_this = null,
  ): LengthAwarePaginator {
    $_this ??= $this;

    // \Log::debug("Paginating query: " . $query->toRawSql());

    $paginate = $query->paginate($pageSize, page: $page);

    // if ($paginate->currentPage() > $paginate->lastPage())
    //   $paginate = $query->paginate($pageSize, page: $paginate->lastPage());

    return $paginate;
  }

  /**
   * Collect the tabling data
   *
   * @param \Illuminate\Http\Request $request The request to get the data from
   * @param string|array $relations The relations to join
   * @param string|array $load The relations to load
   * @param \Illuminate\Database\Query\Builder|\Illuminate\Database\Eloquent\Builder|null $query The query to add the joins to
   * @param array $joins The custom joins to add
   * @param string|array|null $selects The fields to select
   * @param string|array|null $rawSelects The fields to select raw
   * @param callable|null $map The map function
   * @param array $sortables The custom fields that can be sorted
   * @param array $filters The custom fields that can be filtered
   *
   * @return \Illuminate\Http\JsonResponse
   */
  public static function tablingCollect(
    Request $request,
    string|array $relations = [],
    string|array $load = [],
    QueryBuilder|EloquentBuilder|null $query = null,
    array $joins = [],
    string|array|null $selects = null,
    string|array|null $rawSelects = null,
    ?callable $map = null,
    array $sortables = [],
    array $filters = [],
  ): \Illuminate\Http\JsonResponse {
    $static = new static;

    $static->sortable = array_merge($static->getSortFields($static), $sortables);
    $static->filterable = array_merge($static->getFilterFields($static), $filters);

    $request->mergeIfMissing(['page' => 1]);

    $validation = Validator::make($request->all(), $static->getAllRules($static));

    if ($validation->fails())
      return Controller::apiInvalidValuesResponse($validation->errors()->toArray());

    $query = $static->getTablingQuery(
      _this: $static,
      request: $request,
      relations: $relations,
      query: $query,
      joins: $joins,
    );

    $query->select($selects ?? $static->getTable() . '.*');

    if ($rawSelects)
      foreach ($rawSelects as $key => $rawSelect)
        $query->selectRaw($rawSelect . (is_string($key) ? " as $key" : ''));

    $paginate = $static->getPaginate(
      _this: $static,
      pageSize: $request->pageSize ?? $static->count(),
      page: $request->page,
      query: $query,
    );

    $paginate->getCollection()->load($load);

    $items = collect($paginate->items());

    if ($map)
      $items = $items->map($map);

    return Controller::apiSuccessResponse("Items retrieved successfully", [
      'items'      => $items,
      'itemsCount' => $paginate->total(),
      'pagesCount' => $paginate->lastPage(),
      'page'       => min($paginate->currentPage(), $paginate->lastPage()),
    ]);
  }
}
