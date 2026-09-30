# Backend (Laravel) Context Docs — Index

This folder explains the **custom parts** added to the Laravel backend of OTACenter — the base layer,
trait system, models, controllers, routes, auth, database, and tests. It does NOT re-explain vanilla
Laravel.

## Document map

| Doc | Covers | Key files |
|-----|--------|-----------|
| [SRC.md](./SRC.md) | Base classes every resource extends | `app/Src/Controller.php`, `app/Src/Model.php`, `app/Src/ValidationType.php` |
| [TABLING.md](./TABLING.md) | Server-side table pipeline (sort/filter/search/paginate/join) | `app/Models/Traits/Tabling.php` |
| [MODELS.md](./MODELS.md) | All Eloquent models: tables, relations, attributes, validation | `app/Models/*.php` |
| [CONTROLLERS.md](./CONTROLLERS.md) | API controllers + response/file conventions | `app/Http/Controllers/*.php` |
| [ROUTES.md](./ROUTES.md) | API + web routes, middleware wiring | `routes/*.php`, `bootstrap/app.php`, `app/Http/Middleware/*` |
| [AUTH-LDAP.md](./AUTH-LDAP.md) | LDAP auth + Sanctum tokens, custom token format | `app/Ldap/User.php`, `config/ldap.php`, `AuthController`, `app/Models/User.php` |
| [DATABASE.md](./DATABASE.md) | Migrations, seeders, factories | `database/*` |
| [TESTS.md](./TESTS.md) | Test setup + feature-test conventions | `tests/*` |

## Architecture at a glance

- **Laravel 13, PHP 8.3+**, JSON API under prefix `/api`.
- **SPA**: React is served via Blade views (`auth`, `dashboard`); the API is Sanctum-authenticated
  (stateful SPA + personal access tokens). There is **no Inertia** in use — the `HandleInertiaRequests`
  middleware is leftover scaffold and the views are plain entry points (see ROUTES.md).
- **Request lifecycle**: `bootstrap/app.php` (middleware aliases/groups, JSON exception rendering) →
  `routes/web.php` (admin JSON API under the `api` prefix) / `routes/ota_client.php` (device API at
  `/ota-client`, mounted from the `then` closure) → controllers extending `App\Src\Controller` → models
  extending `App\Src\Model` (or `Authenticatable` for `User`).
- **Three core conventions** that everything else builds on:
  1. `App\Src\Controller` — static JSON response helpers + file-move helpers.
  2. `App\Src\Model::validationRules(ValidationType $type, ?Model $record)` — validation lives on the
     model, not the controller.
  3. `Tabling` trait — a single `Model::tablingCollect($request, ...)` powers every list endpoint with
     consistent search/sort/filter/pagination.

## Typical request flow (list endpoint)
```
GET /api/app?page=1&pageSize=10&search=x&sort[name]=asc
  → routes/web.php → api prefix → AppController@index
  → App::tablingCollect($request, selects: ['apps.*'])
  → Tabling: validate → joins → sort → search/filter → paginate → load relations → map
  → Controller::apiSuccessResponse() → { success, message, items, itemsCount, pagesCount, page, query }
```

## Things to watch (gotchas found while exploring)
- `App::validationRules()` and the `apps` table both reference a "current version" column — the column is
  `latest_id` on both `apps` (versions migration) and `versions` (bundles migration); the App update rule
  is `exists:versions,id`. The old `latest_version_id` mismatch is resolved.
- `DomainController` imports `App\Models\User` (fixed — user-domain routes work). `indexByUser`/`indexByApp`
  still pass `selects: ['domain.*']` on the aliased `domain` join table.
- `FileAccessMiddleware` reads `config("file_access.apps.<slug>.auth")` but **no `config/file_access.php`
  exists** — the middleware always aborts unless that config is added.
- `Tabling::tablingCollect()` returns a `query` field containing the raw SQL — debug leftover.
- `FakeDataSeeder` is not called from `DatabaseSeeder` (only `SecuritySeeder` is).
- ⚠️ **Auth guard trap:** the `auth:sanctum` middleware calls `Auth::shouldUse('sanctum')`, changing the
  **default auth guard** to `sanctum`. `sanctum` has no provider in `config/auth.php`, so Spatie's stock
  `Permission::users()` / `Role::users()` relations resolve a `null` model and throw "Class name must be a
  valid object or a string". Fixed by overriding `users()` on `App\Models\Permission` and
  `App\Models\Role` to hard-code `App\Models\User::class` (see MODELS.md).
