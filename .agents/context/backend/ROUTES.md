# Routes & Middleware

> ⚠️ **`routes/api.php` no longer exists.** The admin JSON API moved into `routes/web.php` inside a
> `Route::prefix('api')` group (same `/api` paths as before, Sanctum-protected). The device-facing API
> lives in `routes/ota_client.php`, mounted at `/ota-client` from the `bootstrap/app.php` `then` closure.
> Nothing is auto-registered via `withRouting(api: ...)`.

## Admin API — `routes/web.php` → `prefix('api')` (Sanctum-protected)
**Auth group** (`/api/auth`):
- `POST /login` — no auth. Everything else in this file requires `auth:sanctum`:
- `GET /me`, `PUT /profile`, `DELETE /logout`.
- `POST /register` — invitee activation. Requires `auth:sanctum` **and** `ability:user.invite` (a token
  created by `UserController::invite`), NOT a normal login token. See AUTH-LDAP.md / CONTROLLERS.md.

**Protected resources** (`auth:sanctum`):
| Prefix | Routes |
|--------|--------|
| `domain` | index, store, show, update, destroy (`/{domain}`) |
| `user` | index; `/{user}` show/destroy; `/{user}/role` index + attach(POST)/detach(DELETE); `/{user}/permission` index + attach(POST)/detach(DELETE); `/{user}/domain` index + bind(POST)/unbind(DELETE); `POST /invite` (creates invited user + register link) |
| `role` | index; `/{role}` show; `/{role}/permission` index/attach(POST)/detach(DELETE); `/{role}/user` index |
| `app` | index, store; `/{app}` show/update/destroy; `/{app}/screenshot` index/store/destroy; `/{app}/domain` index + bind/unbind; `/{app}/version` index/store/show/update/destroy/activate; `/{app}/version/{version}/bundle` index/store + `/{bundle}` show/update/activate(POST)/destroy |
| `statistics` | `GET /general` (`general`), `GET /user/{user}` (`byUser`), `GET /role/{role}` (`byRole`), `GET /domain/{domain}` (`byDomain`), `GET /app/{app}` (`byApp`), `GET /version/{version}` (`byVersion`) — each a separate `StatisticsController` method, model-bound; all guarded by `role:super-admin,admin` (Spatie role middleware, NOT `permission:*`) |
| `app/version/bundle` nested ownership | applied via `rec.parent` middleware: app→version (`app-apps-id,version-versions-app_id`) on every `/{version}` route, version→bundle (`version-versions-id,bundle-bundles-version_id`) on every `/{bundle}` route |

> `AuthController::update` is exposed at `PUT /profile`, and version/domain nested bindings use
> singular resource names despite plural prefixes.
> ⚠️ `POST/DELETE /role/{role}/user/{user}` do **not** exist — role↔user binding is
> `POST/DELETE /user/{user}/role/{role}` (see `RoleController`). `RoleAccessTest` has three failing rows
> that still target the nonexistent `/role/{role}/user/{user}` (see TESTS.md).

## OTA client API — `routes/ota_client.php` → `/ota-client`
Mounted from the `bootstrap/app.php` `then` closure: `Route::middleware('ota-client')->prefix('ota-client')`.
The `ota-client` middleware group = `EnsureFrontendRequestsAreStateful` + `throttle:api` +
`SubstituteBindings`. The `/app/*` routes then add **`ota.api_key`** (`OtaApiKeyMiddleware`, matches the
`API-KEY` header against the version — no session) followed by **`device`** (`DeviceMiddleware`, resolves
or creates the device from the request and stashes its id in `$request->attributes->set('device_id', ...)`).
`/v1/health` stays public.
| Route | Controller | Notes |
|-------|-----------|-------|
| `GET /ota-client/v1/health` | `OTAClient\AppController::health` | reachability check |
| `POST /ota-client/v1/app/info` | `OTAClient\AppController::info` | body `{ package, version, bundle }`; resolves app/version/bundle by name and reports `availableUpdates` |

### Route → permission map (enforced via `permission:` middleware)
Every protected route carries a `permission:{name}` middleware (see `AUTH-LDAP.md` for the seeded matrix;
`super-admin` bypasses). `auth` routes (`me/profile/logout`) require only `auth:sanctum`.

| Prefix | Permission |
|--------|-----------|
| `domain` index/show | `domain.view` |
| `domain` store / update / destroy | `domain.create` / `domain.update` / `domain.delete` |
| `user` index/show | `user.view` |
| `user` destroy | `user.delete` |
| `user` invite | `user.invite` |
| `user/{user}/role` index | `role.view` |
| `user/{user}/permission` index | `permission.view` |
| `user/{user}/permission/{permission}` attach / detach | `permission.attach` / `permission.detach` |
| `user/{user}/domain` index | `user.view` |
| `user/{user}/domain/{domain}` bind / unbind | `domain.assign_user` / `domain.unassign_user` |
| `role` index / show | `role.view` |
| `role/{role}/permission` index | `permission.view` |
| `role/{role}/permission/{permission}` attach / detach | `permission.attach` / `permission.detach` |
| `role/{role}/user` index | `role.view` |
| `app` index/show | `app.view` |
| `app` store / update / destroy | `app.create` / `app.update` / `app.delete` |
| `app/{app}/screenshot` index / store / destroy | `screenshot.view` / `screenshot.create` / `screenshot.delete` |
| `app/{app}/domain` index | `app.view` |
| `app/{app}/domain/{domain}` bind / unbind | `domain.assign_app` / `domain.unassign_app` |
| `app/{app}/version` index / show / store / update / destroy / activate | `version.view` / `version.view` / `version.create` / `version.update` / `version.delete` / `version.publish` |
| `.../bundle` index / store / show | `bundle.view` / `bundle.create` / `bundle.view` |
| `.../bundle/{bundle}` show / update / destroy | `bundle.view` / `bundle.update` / `bundle.delete` |
| `.../bundle/{bundle}/activate` | `bundle.publish` |
| `statistics/*` general / by-user / by-role / by-domain / by-app / by-version | `role:super-admin,admin` (not a permission) |

## `routes/web.php` — SPA shells & file serving
- `/` → 301 redirect to `dashboard`.
- `register` (exact, `guest`): Blade `auth` view — **invitee activation page**. The invite link from
  `UserController::invite` points here with `?token=<plainTextToken>` (the registration code is sent
  separately by email and typed by hand).
- `auth{any}` (catch-all, `guest`): Blade `auth` view. Regex `^(?!api|dashboard).*` excludes API & dashboard paths.
- `dashboard{any}` (catch-all, `auth:sanctum`): Blade `dashboard` view. Regex `^(?!api|auth).*`.
- `store{any}` (catch-all, public): Blade `store` view - the public **app store** SPA. Regex
  `^(?!api|dashboard|auth|docs).*`. Its data comes from the unauthenticated `/api/public/*` group
  (`PublicStoreController`), which is deliberately mounted **outside** the `auth:sanctum` group.
- `GET files/{file}` → `File` route-model-bound by string PK `name`, streams
  `Storage::disk('public')->path($file->path)` via `response()->file(...)`. This is the URL produced by
  `File::getUrlAttribute()` (`{host}/files/{name}`).

> There is **no Inertia** in use — `HandleInertiaRequests` is leftover scaffold and not registered in the
> web middleware group. The Blade views are plain entry points that boot React.

## `bootstrap/app.php`
- Routing: `web`, `commands`, `channels`, health `/up`, and a `then` closure that mounts
  `routes/ota_client.php` under `Route::middleware('ota-client')->prefix('ota-client')`.
  (`api: __DIR__ . '/../routes/api.php'` is **commented out** — the admin API is in `web.php`.)
- Middleware **aliases** (custom ones bold):
  `auth` → `App\Http\Middleware\Authenticate`, `guest` → `App\Http\Middleware\RedirectIfAuthenticated`,
  `file.access` → `App\Http\Middleware\FileAccessMiddleware`, `rec.parent` →
  `App\Http\Middleware\EnsureParentChild`, `permission` → `App\Http\Middleware\PermissionMiddleware`,
  `role` → `App\Http\Middleware\RoleMiddleware`, `role_or_permission` →
  `Spatie\Permission\Middleware\RoleOrPermissionMiddleware` (note: `EnsurePermission` maps to the alias
  `permission` — the file `app/Http/Middleware/PermissionMiddleware.php`), plus standard `auth.basic`,
  `cache.headers`, `can`, `password.confirm`, `signed`, `throttle`, `session`, Sanctum `abilities`/`ability`.
  The stock `verified` alias is commented out.
- `web` group: standard cookie/session/CSRF stack (`EncryptCookies`, `AddQueuedCookiesToResponse`,
  `StartSession`, `ShareErrorsFromSession`, `VerifyCsrfToken`, `SubstituteBindings`).
- `api` group: `EnsureFrontendRequestsAreStateful` (Sanctum SPA), `throttle:api`,
  `SubstituteBindings`. **No CSRF** in the API group.
- `ota-client` group: `EnsureFrontendRequestsAreStateful` + `throttle:api` + `SubstituteBindings` +
  **`App\Http\Middleware\DeviceMiddleware`**. **No CSRF.**
- All `{id}` route params (`app`, `version`, `bundle`, `domain`, `user`, `screenshot`) carry a
  `whereNumber` constraint → non-numeric ids get a 404 instead of a Postgres cast crash.
- Exceptions: `shouldRenderJsonWhen(fn($request) => $request->is('api/*'))` — API errors render as JSON
  (note: only `api/*` — `/ota-client/*` errors are not JSON-rendered by this predicate).

## Custom middleware

### `Authenticate` (alias `auth`)
Extends the stock behavior: on failure, if the request **expects JSON** returns
`Controller::apiErrorResponse('Unauthenticated', code: 401)`; otherwise throws `AuthenticationException`
redirecting to `route('auth', ['/login'])` (see `getAuthRoute()`).

### `RedirectIfAuthenticated` (alias `guest`)
If the guard check passes → `redirect()->route('dashboard', ['/'])`.

### `FileAccessMiddleware` (alias `file.access`) — NOT wired to any route
Reads `config("file_access.apps.<app-slug>.auth")` (and `.guard`) to decide whether to allow the request.
⚠️ **No `config/file_access.php` exists** — the config returns `null`, and the condition
`$auth === false || $auth && ...` is `false`, so this middleware **always aborts 401** unless the config
file is added. Intended for per-app protected download routes.

### `HandleInertiaRequests`
Unused Inertia scaffold (not registered). Safe to remove.

### `EnsureParentChild` (alias `rec.parent`) — dynamic parent/child ownership check
Verifies that a child route param belongs to a parent route param. Runs **after** `SubstituteBindings`
(route-level middleware), so already-resolved Eloquent models are reused; otherwise it falls back to a
`DB::table(<table>)` lookup by `id`.
- Signature: `rec.parent:{parentParam}-{parentTable}-{parentColumn},{childParam}-{childTable}-{childColumn}`.
- Check: `child[childColumn] != parent[parentColumn]` (loose compare) → on failure returns
  `Controller::apiErrorResponse('Not found', code: 404)`.
- Examples:
  - `rec.parent:app-apps-id,version-versions-app_id` — `version.app_id === app.id`.
  - `rec.parent:version-versions-id,bundle-bundles-version_id` — `bundle.version_id === version.id`.
- Apply multiple chains by stacking the middleware (once per relationship level).

### `PermissionMiddleware` (alias `permission`) — RBAC gate (Spatie-based)
Extends `Spatie\Permission\Middleware\PermissionMiddleware`. Reads the user via `Auth::guard($guard)`
(after `auth:sanctum` that resolves the sanctum-guard user); supports `|`-separated permission lists and
`super-admin` bypass. On JSON requests returns a JSON `Forbidden` via `Controller::wantsJson()`.
- Signature: `permission:{name}`.
- ⚠️ A legacy `EnsurePermission` middleware (`app/Http/Middleware/EnsurePermission.php`) still exists with
  the same intent (super-admin bypass + 403/401 JSON) but is **no longer aliased** in `bootstrap/app.php`
  and is not referenced by any route — the `permission` alias now resolves to `PermissionMiddleware`.
- Applied to every protected resource route; see the route → permission table above.
- ⚠️ Order on nested routes: `permission` is declared before `rec.parent` so unauthorized callers get a 403
  instead of a resource-existence 404.

### `RoleMiddleware` (alias `role`)
Extends `Spatie\Permission\Middleware\RoleMiddleware`. Used by the `statistics/*` routes with
`role:super-admin|admin` (role gate, NOT a permission).

### `DeviceMiddleware` — OTA device resolution (only the `ota-client` group)
Parses the `X-Device-Info` header (`did=...;mf=...;br=...;mdl=...;av=...;sdv=...`), validates `did`
(required) + the rest nullable. `Device::firstOrCreate(['did' => ...])` with `user_id` from the current
user (null when unauthenticated) and the device metadata; then
`$request->attributes->set('device_id', $device->id)` for downstream controllers
(`OTAClient\AppController::info` reads it).
