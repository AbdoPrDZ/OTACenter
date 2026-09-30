# `app/Src/` — Base Layer

The base classes every resource extends. All controllers extend `App\Src\Controller`; all Eloquent
models (except `User`, which extends `Authenticatable` directly) extend `App\Src\Model`.

## `Controller.php`

Extends `Illuminate\Routing\Controller` and adds `AuthorizesRequests, ValidatesRequests`. Everything is
**static** and returns a JSON envelope `{ success, message, ...data }`.

### Response helpers

| Helper | Defaults | Notes |
|--------|----------|-------|
| `apiResponse($success, $message, $data=[], $code=200)` | — | Base envelope, spreads `$data` at top level |
| `apiSuccessResponse($message, $data=[], $code=200)` | `success: true` | |
| `apiErrorResponse($message, $data=[], $code=400)` | `success: false` | |
| `apiInvalidValuesResponse($errors, $message=null, $data=[], $code=400)` | `400` | Flattens each error array to its first message; if `$message` null and exactly 1 error, uses it as the message; adds `errors => [...$data, 'errors' => $errors]` |
| `apiSingleErrorResponse($field, $message, $data=[], $code=400)` | `400` | Wraps one field error via `apiInvalidValuesResponse` |

### File helpers (stored via `App\Models\File`, string PK `name`)

| Helper | Behavior |
|--------|----------|
| `moveFile(Request, field, dirPath, name)` | `UploadedFile` → ensures dir on `public` disk → moves as `name.<ext>` → `File::create(['name' => $name, 'path' => "<dir>/<name>.<ext>"])`. Throws if missing field or non-UploadedFile. |
| `moveBase64File(Request, field, dirPath, name)` | Takes base64 string from request input, delegates to `createBase64File`. |
| `createBase64File($base64, dirPath, name)` | Decodes base64, extracts extension via `preg_match('/^data:(.*?);base64,/')`, writes to `public` disk, creates `File` row with the same `name` as key. |

> Note: `moveBase64File`/`createBase64File` put the raw (undecoded-extension) name into the path, while
> `moveFile` appends the real extension — the two paths can disagree on the stored `File.path`.

### Misc
- `wantsJson()` — true if first acceptable content type is `application/json` (used by `FileAccessMiddleware`).

## `Model.php`

`abstract class Model extends EloquentModel` bundling `HasFactory, Tabling, SoftDeletes`.

- Soft deletes are **on by default** for every model.
- `public static function validationRules(ValidationType $type, ?Model $record = null): array` throws
  `BadMethodCallException` by default — every concrete model **must override** it to return Laravel rule
  arrays. Controllers call this and run `Validator::make($request->all(), Model::validationRules(...))`.

## Per-role serialization (via `Tabling`)

Resource models override `toArray()` to return role-scoped data (see MODELS.md for per-model field
lists):
- `$role = request()->user()?->role || 'user'` — the requester's **highest** role
  (`User::getRoleAttribute()`); `null` user (unauthenticated) → `'user'`.
- Base fields are always present; a `switch` on `$role` adds privileged fields for
  `super-admin`/`admin`/`developer` (typically internal file ids, `path`, download `url`, `api_key`,
  `updated_at`).
- `mergeArrayableRelations()` (from `Tabling`) is called at the end of every override so eager-loaded
  relations (e.g. `domains` on app/user lists) are still serialized. This matters because a custom
  `toArray()` bypasses Eloquent's default relation serialization.

## `ValidationType.php`

```php
enum ValidationType: string
{
  case Create = 'create';
  case Update = 'update';
}
```

Passed to `validationRules()` so rules can differ between create and update (e.g. `unique` rules that
ignore the current record).

## Convention summary
1. Controllers: `class XController extends Controller`, use static `Controller::api*Response()` helpers.
2. Models: extend `App\Src\Model`, declare `#[Fillable(...)]` / `#[Hidden(...)]`, override
   `validationRules()`, and (if listed) define `$sortable`/`$filterable`/`$tablingRules`.
3. List endpoints call `Model::tablingCollect($request, ...)` (see TABLING.md).
