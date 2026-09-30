# Authentication & LDAP

Auth is **LDAP-driven** via `directorytree/ldaprecord-laravel`, combined with **Laravel Sanctum**
personal access tokens for the SPA. Users do not store usable passwords.

## Stack
- `config/auth.php` `providers.users` uses **`driver => 'ldap'`** with:
  - LDAP model: `App\Ldap\User` (`objectClasses: ['user']`, standard `dates` for AD timestamps).
  - DB model: `App\Models\User` with `sync_attributes: ['name' => 'cn', 'login' => 'userprincipalname']`,
    `sync_existing: ['login' => 'userprincipalname']`, `sync_passwords => false`, `password_column => false`.
  - Guards: `web` (session, `users` provider) + `dashboard` (session, `admins` — provider not defined, scaffold leftover).
- `config/ldap.php` — one `default` connection from env (`LDAP_HOST`, `LDAP_PORT`, `LDAP_BASE_DN`,
  `LDAP_USERNAME`, `LDAP_PASSWORD`, `LDAP_TLS`, `LDAP_STARTTLS`, `LDAP_SASL`); logging + cache options.

## Login flow (`AuthController@login`)
1. Validate `login` + `password` (+ optional `remember`).
2. **Local-first**: if `App\Models\User` with that `login` exists **and** has a `password`, try
   `Hash::check`; on success `Auth::login` + regenerate session.
3. **Otherwise LDAP**: append `LDAP_LOGIN_SUFFIX` to login if configured, then
   `Auth::attempt(['userprincipalname' => $login, 'password' => ...], $remember)` — this uses the `users`
   ldap provider which searches `App\Ldap\User` by `userprincipalname` and **imports/syncs into**
   `App\Models\User` (name ← `cn`, login ← `userprincipalname`, matched by `login`).
4. On success: `auth()->user()` (now a DB `App\Models\User`) → issue a Sanctum token:
   `createToken('user')->plainTextToken` and return it in the envelope.

> Because `App\Models\User::getAuthPassword()` returns `null`, password-based login can never succeed via
> the framework — only the explicit `Hash::check` branch (step 2) or LDAP can log users in.

## Custom token format (`App\Models\User::createToken`)
Overrides Sanctum's default:
```
plainText = <sanctum.token_prefix?> + Str::random(40) + hash('crc32b', entropy)
db.token   = sha256(plainText)
plainTextToken returned to client = "<id>|<plainText>"
```
Writes `data` (JSON), `abilities`, `expires_at`. Requires the custom `App\Models\PersonalAccessToken`
(casts `data`/`abilities` to JSON) — registered in `AppServiceProvider::boot()` via
`Sanctum::usePersonalAccessTokenModel(...)`.

## Logout
`AuthController@logout` deletes **all** tokens for the user, flushes session, logs out the web guard.

## Authorization / roles (Spatie Permissions)
- `App\Models\User` uses `HasRoles`. Permissions are **enforced on every protected route** via the
  `permission:{name}` middleware alias (`App\Http\Middleware\EnsurePermission`), registered in `bootstrap/app.php`.
  It resolves the user from the request (guard `sanctum`, set by `auth:sanctum`) — NOT Spatie's default `web`
  guard — then delegates to Spatie's `hasPermissionTo()`. `super-admin` bypasses all checks (like a `Gate::before`).
  Forbidden → `Controller::apiErrorResponse(..., 403)` (standard JSON envelope).
- **`/auth/me` and `/auth/profile` payload** (`AuthController::userPayload()`): besides `id`/`name`/
  `login`/`image_url`, the response now includes `roles` (`getRoleNames()`) and `permissions`
  (`getAllPermissions()->pluck('name')`). `getAllPermissions()` returns the user's **effective**
  permissions (direct + inherited via roles), matching the middleware's `hasPermissionTo`. A
  `super-admin` typically has **no explicit permission grants** — `getAllPermissions()` returns an empty
  list for it, so the frontend must treat the `super-admin` **role** as "has every permission" (see
  `resources/js/utils/permissions.ts`). The frontend `User.decode` reads these two arrays into
  `IUser.roles` / `IUser.permissions`.
- `SecuritySeeder` creates roles `super-admin`, `admin`, `developer`, `user`, `guest` and permissions:
  - user: `user.view`, `user.invite`, `user.delete`
  - role/permission: `*.view/attach/detach`
  - domain: `domain.view` (+ all super-admin/admin; view also developer/user), `domain.create/update/delete`,
    `domain.assign_user/unassign_user`, `domain.assign_app/unassign_app`
  - app: `app.view` (also dev/user), `app.create/update/delete`, `app.publish`
  - version: `version.view` (also dev/user), `version.create/update` (also developer), `version.delete`,
    `version.publish`
  - bundle: `bundle.view` (also dev/user), `bundle.create/update` (also developer), `bundle.delete`,
    `bundle.publish`
  - screenshot: `screenshot.view` (also dev/user), `screenshot.create/update` (also developer),
    `screenshot.delete`
- `statistics/*` routes are gated by the **`role:super-admin,admin` middleware** (Spatie), NOT a
  permission — no `statistics.*` permission is seeded.
- Users are LDAP-imported only — there is intentionally **no** `user.create`/`user.update`.
- Route → permission mapping lives in `routes/web.php` under the `api` prefix (see `ROUTES.md`).

## Gotchas
- `AuthController@login` logs the full credentials JSON at INFO level — remove before production.
- `Auth::attempt` for LDAP will create/update DB users automatically (import-on-login).
- The `dashboard` guard references an undefined `admins` provider — currently unused.
