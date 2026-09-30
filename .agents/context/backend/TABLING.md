# `Tabling` Trait — Server-Side Table Pipeline

`app/Models/Traits/Tabling.php` — one trait that powers **every list endpoint** with consistent
validation, joins, sorting, search, filtering, and pagination. It returns a ready-to-send JSON response.

Included automatically by `App\Src\Model` (and used manually by `App\Models\User`, which pulls in the
trait itself since it does not extend the base model).

## Model-declared config
| Property | Used for | Fallback |
|----------|----------|----------|
| `$sortable` | Fields allowed in `sort` | `$fillable` |
| `$filterable` | Fields allowed in `filter`/`search` | `[]` |
| `$tablingRules` | Extra Laravel validation rules merged on top | `[]` |

Keys may be numeric (plain column) or associative (`'displayName' => 'db_column'`).

## `mergeArrayableRelations(array $data): array`
Public helper (also used by `App\Models\User`, which uses the trait directly): merges the model's
eager-loaded relations into a hand-built serialization array. Every per-role `toArray()` override ends
with `return $this->mergeArrayableRelations($data)` so loaded relations (e.g. `domains`) survive a
custom `toArray()` that would otherwise bypass Eloquent's default relation serialization.

## Entry point

```php
Model::tablingCollect(
  Request $request,
  string|array $relations = [],   // belongsTo relations to leftJoin
  string|array $load = [],        // relations to eager-load on the result collection
  QueryBuilder|EloquentBuilder|null $query = null, // base query (custom)
  array $joins = [],              // extra [table, first, operator, second] leftJoin tuples
  string|array|null $selects = null,   // default: "<table>.*"
  string|array|null $rawSelects = null,// selectRaw list, optional 'alias' => 'expr'
  ?callable $map = null,          // maps the collection of items
  array $sortables = [],          // extra sortable fields
  array $filters = [],            // extra filterable fields
): JsonResponse
```

## Request contract (validated by the trait)
| Param | Rule | Notes |
|-------|------|-------|
| `page` | `required\|integer\|min:1` | defaults to `1` via `mergeIfMissing` |
| `pageSize` | `nullable\|integer\|min:5` | default: **total row count** (`$static->count()`) — effectively returns all rows |
| `search` | `nullable\|string` | `LIKE %search%` across **every filterable field** (OR'd) |
| `sort` | `nullable\|array` of `{ field: asc\|desc }` | only fields in sortable list |
| `filter` | `nullable\|array` of `{ field: string }` | `LIKE %value%` OR'd per field (only if **no** `search`) |

On validation failure → `Controller::apiInvalidValuesResponse($validation->errors()->toArray())`.

## Behavior
1. `sortable`/`filterable` merged with the extra `$sortables`/`$filters` passed per call.
2. `withJoins()` — for each relation name: `leftJoin("<table> as <relation>", "relation.<fk>", "=", "<foreign key>")`
   (derived from the Eloquent relation metadata), plus any explicit `$joins`.
3. Sorting — iterates the model's sortable list, applies `orderBy(column, direction)` for each present sort key.
4. Search/filter — wraps in `where(function ($q) {...})` OR'ing `LIKE %…%` across filterable columns.
   - Logs debug lines (`\Log::info`) on every filter/search — noisy in production logs.
5. `select($selects ?? "<table>.*")`, then applies `selectRaw` aliases.
6. Paginate with `pageSize` (default all rows) and `page`.
7. `$paginate->getCollection()->load($load)` eager-loads relations on the page's items.
8. Optional `$map` transforms each item (used e.g. to compute the logo URL or the current version).
9. Returns via `Controller::apiSuccessResponse("Items retrieved successfully", [...])`.

## Response shape
```json
{
  "success": true,
  "message": "Items retrieved successfully",
  "items": [...],
  "itemsCount": 12,
  "pagesCount": 2,
  "page": 1,
  "query": "select ... (raw SQL)"
}
```
> `query` is the raw SQL string — a debug leftover. The frontend `Request` wrapper reads `items`,
> `itemsCount`, `pagesCount`, `page`. Consider removing `query` before production.

## Gotchas
- `pageSize` has no upper bound and defaults to the total count — huge lists are fully returned.
- Filter uses `orWhere` inside the wrapper — combined with joins this can duplicate rows (no `groupBy`).
- Joining relations assumes the relation method exists and that the derived join columns are correct;
  pass explicit `$joins` when they aren't.
