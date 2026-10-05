# Controllers — `app/Http/Controllers/`

All extend `App\Src\Controller` (see SRC.md). Every list endpoint delegates to the `Tabling` trait via
`Model::tablingCollect(...)`. CRUD validation runs `Validator::make($request->all(), Model::validationRules($type, $record))`
and returns `apiInvalidValuesResponse` on failure.

## Shared CRUD pattern
1. Validate via `Model::validationRules(ValidationType::Create | Update, $record)`.
2. `$fields = array_diff(array_keys($rules), ['<fileField>'])` — strip the file field from mass-assignment.
3. `Model::create($request->only($fields))` (or `$parent->relation()->create(...)`).
4. If the request has the file, `Controller::moveFile(...)` → update the `*_id` FK with `$file->name`.
5. Respond `apiSuccessResponse(msg, ['item' => $record->toArray()])`.

## `AuthController`
| Method | Notes |
|--------|-------|
| `login(Request)` | Validates `login`, `password`, optional `remember`. **Local-first**: if `User::where('login')` exists and has a `password`, tries `Hash::check`. Otherwise/if no password, does LDAP auth via `Auth::attempt(['userprincipalname' => $login, 'password' => ...])`, appending `LDAP_LOGIN_SUFFIX` if set. On success returns `['token' => $user->createToken('user')->plainTextToken]`. Logs credentials (INFO) — privacy leak. |
| `register(Request)` | **Invitee activation**: validates `code`, `name`, `login` (email, unique ignoring self), `password` (min 8, confirmed). Requires an `auth:sanctum` token with `ability:user.invite` (from the invite). Reads `code` from the token's `data` column; 400 `Invalid code` on mismatch, 400 on `login` mismatch with the invited email. Sets `name`/`login`/`password`, then **deletes the invite token**. |
| `me()` | Returns `$this->userPayload($user)` → `{ id, name, login, image_url, roles, permissions }`. |
| `update(Request)` | Profile update: `User::validationRules(Update, $user)`; moves optional `image` to `users/`, sets `image_id`; returns `userPayload($user)`. |
| `logout(Request)` | Deletes ALL of the user's tokens, flushes session, logs out web guard. |

> `userPayload(User)` (private) returns `{ id, name, login, image_url, roles: getRoleNames(),
> permissions: getAllPermissions()->pluck('name') }`. `getAllPermissions()` = the user's **effective**
> permissions (direct + via roles), matching `EnsurePermission`. ⚠️ A `super-admin` has no explicit grants,
> so `permissions` is empty for it — the frontend treats the `super-admin` *role* as "has every permission"
> (`utils/permissions.ts`). See AUTH-LDAP.md.

## `AppController`
| Method | Notes |
|--------|-------|
| `index` | `App::tablingCollect($request, selects: ['apps.*'], load: ['domains'])` — each row includes its `domains` relation (rendered as tags in `AppsTab`). |
| `show` | `{ item }`. |
| `store` | Strips `logo`, creates app, moves logo to `apps/app-{id}-logo-{time}`, sets `logo_id`. |
| `update` | Same, updates record first. |
| `destroy` | Soft-deletes app. |
| `indexScreenshot(App)` | `AppScreenshot::tablingCollect` with `relations: ['file']` (join), `load: ['file']`, `selects: ['file.*']`, scoped by `app_id`. **Bug**: selects `file.*` on the pivot table join — the `file` column doesn't exist; should be `files.*` (also `indexByUser`/`indexByApp` in DomainController select `domain.*` while the joined table is `domains as domain`). |
| `storeScreenshot(App)` | Moves file to `screenshots/`, creates `AppScreenshot(app_id, file_id)`, returns `screenshot->file->url`. |
| `destroyScreenshot` | Verifies ownership, deletes pivot row (does NOT delete the physical file or File row). |

## `DomainController`
CRUD mirrors AppController (image → `apps/` dir). Plus user/app domain bindings:
| Method | Notes |
|--------|-------|
| `indexByUser(User)` / `bindUser` / `unbindUser` | Operate on `UserDomain` pivot (`user_domains`) via `App\Models\User`. `bindUser` uses `firstOrCreate` (already-bound → idempotent success). |
| `indexByApp(App)` / `bindApp` / `unbindApp` | Operate on `AppDomain` pivot (`app_domains`). |

> ⚠️ `indexByUser`/`indexByApp` pass `selects: ['domain.*']` + `relations: ['domain']` to `tablingCollect`.
> The join aliases the table as `domain`, so `domain.*` is valid there — but be aware the returned rows are
> pivot rows with the joined domain columns, and `load: ['domain']` is applied on top.

## `UserController`
`index` → `User::tablingCollect($request, selects: ['users.*'], load: ['domains'])` — each row includes
its `domains` relation (rendered as tags in `UsersTab`); `show` → `{ item }`; `destroy` → soft delete.
`invite(Request)` → creates a local user from `name`+`email` (`login = email`), `assignRole($request->role)`,
optionally attaches `domain_id`, generates an 8-char uppercase `code` and a Sanctum token with
`abilities: ['user.invite']` and `data: ['code' => $code]`, then returns `{ link }` where the link is
`route('register', ['token' => <plainTextToken>])` (only the token is in the URL). The **code is NOT in
the link** — it is meant to be sent to the user by email (`## Send email...` TODO, mail not wired yet);
the invitee types it manually on the register page. Permission-gated `user.invite`. No create/update
(users are LDAP-imported, except invites).

Direct permission editing (the UserTab **Security** tab) — routes under `/user/{user}/permission` are backed
by **`PermissionController`** (not `UserController`):
| Method | Notes |
|--------|-------|
| `indexByUser(User)` | `Permission::tablingCollect(...)` scoped by `whereHas('users', id = $user->id)` — the user's **directly** granted permissions (gated `permission.view`). |
| `attachToUser(User, Permission)` | `$user->givePermissionTo($permission)`; 400 if already assigned (checked via `hasDirectPermission`). Gated `permission.attach`. |
| `detachFromUser(User, Permission)` | `$user->revokePermissionTo($permission)`; 400 if not assigned (`hasDirectPermission`). Gated `permission.detach`. |

> These operate on the Spatie `model_has_permissions` pivot (direct grants, NOT role inheritance). The
> user's roles are listed/edited via the existing `RoleController::indexByUser`
> (`GET /user/{user}/role`, gated `role.view`) and the role attach/detach endpoints.

## `RoleController`
Wraps the Spatie `Role` model (extends the package base, `app/Models/Role.php`, adds `Tabling`).
Routes at `/role[/{role}[/permission | /user[/{user}]]]`, permission-gated via `role.view` /
`role.attach` / `role.detach` (see ROUTES.md).
| Method | Notes |
|--------|-------|
| `index` | `Role::tablingCollect($request, selects: ['roles.*'])`. |
| `show` | Returns `{ item }`. |
| `indexUsers(Role)` | `User::tablingCollect(...)` scoped by `whereHas('roles', id = $role->id)` — attached users for the RoleTab. |
| `indexByUser(User)` | `Role::tablingCollect(...)` scoped by `whereHas('users', id = $user->id)`. |
| `attachToUser(Role, User)` | `$user->roles()->attach($role)`; 400 if already attached. |
| `detachFromUser(Role, User)` | `$user->roles()->detach($role)`; 400 if not attached. |

> The role's permission list moved to **`PermissionController::indexByRole`** (`GET /role/{role}/permission`),
> and role↔permission attach/detach live on `PermissionController::attachToRole` / `detachFromRole`
> (`POST/DELETE /role/{role}/permission/{permission}`).

> Attach/detach operate on the Spatie morph pivot (`model_has_roles`). No create/update/delete of roles
> themselves is exposed — roles are seeded by `SecuritySeeder`.
>
> `indexByUser` is what backs the UserTab Security tab's roles checkboxes — it was previously shipping
> **all** roles (the `whereHas('users')` scope was commented out), causing every role to appear assigned.

## `PermissionController`
Wraps the Spatie `Permission` model (`app/Models/Permission.php` extends the package base, adds `Tabling`).
There is **no standalone `/permission` resource** in the router — this controller backs the role↔permission
(`/role/{role}/permission`) and user↔permission (`/user/{user}/permission`) bindings that were moved here
from `RoleController`/`UserController`. The old `index`/`show`/`indexRoles`/`indexUsers` methods were
removed (their `/permission` routes no longer exist).
| Method | Route | Notes |
|--------|-------|-------|
| `indexByRole(Role)` | `GET /role/{role}/permission` | `Permission::tablingCollect(...)` scoped by `whereHas('roles', id = $role->id)` — the role's permissions for the RoleTab table (gated `permission.view`). |
| `attachToRole(Role, Permission)` | `POST /role/{role}/permission/{permission}` | `$role->permissions()->attach($permission)`; 400 if already attached (gated `permission.attach`). |
| `detachFromRole(Role, Permission)` | `DELETE /role/{role}/permission/{permission}` | `$role->permissions()->detach($permission)`; 400 if not attached (gated `permission.detach`). |
| `indexByUser(User)` | `GET /user/{user}/permission` | `Permission::tablingCollect(...)` scoped to the user's **effective** permissions — direct grants (`whereHas('users')`) **OR** role-granted (a correlated `role_has_permissions` EXISTS subquery). Each item is annotated with a `direct` boolean (true = granted directly, false = inherited via a role) via the `$map` callback so the frontend can distinguish toggleable direct grants from role-inherited ones. Gated `permission.view`. |
| `attachToUser(User, Permission)` | `POST /user/{user}/permission/{permission}` | `$user->givePermissionTo($permission)`; 400 if `hasDirectPermission` (gated `permission.attach`). |
| `detachFromUser(User, Permission)` | `DELETE /user/{user}/permission/{permission}` | `$user->revokePermissionTo($permission)`; 400 if no direct grant (gated `permission.detach`). |

> Attach/detach operate on the Spatie `model_has_permissions` pivot (direct grants, NOT role inheritance).
> `indexByUser` is the exception — it returns the user's **effective** permission set (direct + role) with
> a `direct` flag distinguishing the two. The role↔user attach/detach lives on `RoleController`
> (`POST/DELETE /role/{role}/user/{user}` is **not** in the router — only `GET /role/{role}/user`;
> user↔role binding is via `/user/{user}/role`).

## `StatisticsController`
Read-only statistics under `/statistics` (all `role:super-admin,admin`, NOT `permission:*` — see
ROUTES.md). `general` returns `{ statistics: {...} }`; the `by*` methods are model-bound and return
`{ item: {...}, statistics: {...} }`.
| Method | Route | Returns |
|--------|-------|---------|
| `general` | `GET /statistics/general` | Aggregate totals + with/without breakdowns: users (`total`, `with_domains`, `without_domains`), roles total, domains total, apps (`total`, `with_versions`, `without_versions`), versions (`total`, `by_status`, `with_bundles`, `without_bundles`), bundles (`total`, `by_status`). The former per-entity drill-down lists (`per_role`, `users_per_domain`, ...) were removed — per-entity stats now live on the model pages via the `by*` methods. |
| `byUser(User $user)` | `GET /statistics/user/{user}` | `item` { id, name, login, image_url }; `statistics` = roles[], domains[], roles_count, domains_count |
| `byRole(Role $role)` | `GET /statistics/role/{role}` | `item` { id, name, guard_name }; `statistics` = users[] ({id,name,login}), users_count |
| `byDomain(Domain $domain)` | `GET /statistics/domain/{domain}` | `item` { id, name, description, image_url }; `statistics` = users[], apps[] ({id,name}), users_count, apps_count |
| `byApp(App $app)` | `GET /statistics/app/{app}` | `item` { id, name, package_name, logo_url }; `statistics` = versions[] ({id,name,status,bundles_count}), versions_by_status, domains[], versions_count, bundles_count, domains_count |
| `byVersion(Version $version)` | `GET /statistics/version/{version}` | `item` { id, name, status, app_id, app_name }; `statistics` = bundles[] ({id,name,url}), bundles_count, active_bundle ({id,name} \| null) |

Private helper: `countByStatus(QueryBuilder $query, array $statuses)` (fills missing statuses with 0;
accepts a query builder so it also works scoped, e.g. `Version::where('app_id', $app->id)` in `byApp`).
The former `usersPerRole` / `usersPerDomain` / `appsPerDomain` / `versionsPerApp` /
`bundlesPerVersion` breakdown helpers were removed along with the drill-down lists in `general`.

## `VersionController`
All nested under an `App`. Ownership (`$version->app_id === $app->id`) is enforced by the `rec.parent`
middleware on the `/{version}` routes (see ROUTES.md), **not** in the controller.
`store` moves the file to `versions/` **first**, then creates via `$app->versions()->create([...$fields,
'file_id' => ...])` — required because `versions.file_id` is NOT NULL.
| Method | Notes |
|--------|-------|
| `index` | `Version::tablingCollect($request, selects: ['versions.*'], query: ...->where('app_id', $app->id))`. |
| `show` | Returns `{ item }`. |
| `store` | Validates Create rules (requires `name`, `changelog`, `api_key`, `file`), moves file to `versions/`, creates via `$app->versions()->create(...)`. Defaults a missing `status` to `draft`. |
| `update` | Validates Update rules, updates the version, and **only when `$request->hasFile('file')`** moves a new file and overwrites `file_id` — file replacement is now optional (metadata-only updates work). |
| `download` | Streams the stored APK and writes a `DownloadHistory` row (`user_id`, `target = Version`). ⚠️ **Not routed** — no `.../version/{version}/download` route exists yet. |
| `activate` | `POST /app/{app}/version/{version}/activate` — sets `apps.latest_id` to this version (the "publish / set-as-latest" action, gated `permission:version.publish`). |
| `destroy` | Soft-deletes the version. |

> `GET/PUT /app/{app}/version/{version}` were **added** to back the new frontend
> VersionTab (edit + bundles table). `activate` (above) is the "publish / set-as-latest" action that writes
> `apps.latest_id`. ⚠️ Its route **name** `app.version.bundle.activate` is duplicated with the bundle
> activate route — URL dispatch works, but `route('app.version.bundle.activate')` resolves to the bundle route.

## `BundleController`
Nested under `App` → `Version` (`/app/{app}/version/{version}/bundle[/{bundle}]`). Ownership
(version↔app and bundle↔version) is enforced by stacked `rec.parent` middleware on the routes (see
ROUTES.md), **not** in the controller.
| Method | Notes |
|--------|-------|
| `index` | `Bundle::tablingCollect($request, selects: ['bundles.*'], load: ['file'], query: ...->where('version_id', $version->id))`. |
| `store` | Validates `Bundle::validationRules(Create)` (requires `name` + `file`), `moveFile($request, 'file', 'bundles', "app-{id}-version-{id}-bundle-{time}")`, then `$version->bundles()->create([...])` — defaults a missing `status` to `draft`. File rule `extensions:zip` checks the **extension only** — content is never inspected. |
| `show` | Returns `{ item }`. |
| `download` | Streams the stored ZIP and writes a `DownloadHistory` row (`user_id`, `target = Bundle`). ⚠️ **Not routed** — no `.../bundle/{bundle}/download` route exists yet. |
| `update` | Validates Update rules, updates `name`/`changelog`/`status`, and **only when `$request->hasFile('file')`** moves a new ZIP to `bundles/` and overwrites `file_id` (file replacement optional). Added alongside the new `PUT .../bundle/{bundle}` route to back the frontend BundleTab. |
| `activate` | `$version->update(['latest_id' => $bundle->id])` — selects the version's active bundle (writes `versions.latest_id`, gated `permission:bundle.publish`). |
| `destroy` | Nulls `versions.latest_id` first if this bundle is the active one, then soft-deletes the bundle. |

## `OTAClient\AppController` — device-facing OTA endpoints
Device API (not admin) mounted at `/ota-client/v1` via `routes/ota_client.php`; every app-facing request carries an `API-KEY` header that `OtaApiKeyMiddleware` matches against the
resolved version (or the version named in the `info` payload) before anything else, then passes
`DeviceMiddleware` (`ota-client` group, see ROUTES.md), which resolves/creates the device and stashes its
id in `$request->attributes->set('device_id', ...)`.
| Method | Notes |
|--------|-------|
| `health` | `GET /ota-client/v1/health` — `{ success: true }`; lets a client learn the endpoint is reachable. |
| `info` | `POST /ota-client/v1/app/info` — body `{ package, version, bundle }` (`bundle` = `"base"` or a bundle name). Resolves `App` by `package_name`, `Version` by `name`, `Bundle` by `name` (the bundle version string — **not** a numeric id). Attaches the device via `$device->apps()->syncWithoutDetaching([$app->id => ['version_id' => ..., 'bundle_id' => ...]])` (`bundle_id` null for `"base"`). Reports `availableUpdates.version` when `app.latest_id` points at a newer version (via `App::latest()`), and `availableUpdates.bundle` when the version's `latest_id` points at a newer bundle (via `Version::latest()`). Returns `{ device_id, appId, versionId, bundleId, availableUpdates }`. |

> The `info` response names are exact (camelCase `appId`, `versionId`, `bundleId`) — matched by the
> native OTA client app.

## `PublicStoreController` — public app store (unauthenticated)

Mounted at `/api/public` (see ROUTES.md), **outside** the `auth:sanctum` group, throttled. It only ever
touches apps bound to a domain with `is_public = true` that also have a `status = 'published'` version
(`publicAppsQuery()` / `isPublic()`), and it builds its own response shapes: `App::toArray()` and
`Version::toArray()` are **not** used, because their privileged branch is selected for every request
(the `$user?->role || 'user'` + loose-`switch` quirk) and would leak `api_key`, `file_id` and `path`.

| Method | Notes |
|--------|-------|
| `index` | `GET /api/public/apps` — `tablingCollect` over `publicAppsQuery()` (search + optional `domain` filter + pagination); `map`s each app to a card (`id, name, package_name, summary, logo_url, domains[], version, updated_at`) via `card()`. |
| `domains` | `GET /api/public/domains` — public domains that have at least one published app, with `apps_count` (drives the store's filter). |
| `show` | `GET /api/public/apps/{app}` — 404 unless `isPublic()`; adds `description`, `screenshots[]`, published `versions[]` (name, changelog, size, created_at) and `download_url`. |
| `download` | `GET /api/public/apps/{app}/download` — 404 unless `isPublic()`; streams `installableVersion()` (the app's `latest` when published, else the newest published) via `response()->download()` and writes a `DownloadHistory` row with null `user_id`/`device_id`. |

