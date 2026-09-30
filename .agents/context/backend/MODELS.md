# Eloquent Models

All models are in `app/Models/`. Most extend `App\Src\Model` (base: `HasFactory` + `Tabling` +
`SoftDeletes`, see SRC.md). Exceptions: `User`, the pivot models, `Setting`, and `PersonalAccessToken`
— see each section.

Conventions used across models:
- Mass-assignment via the `#[Fillable([...])]` attribute; serialization via `#[Hidden([...])]`.
- Appended accessors (`$appends`) expose file URLs (`logo_url`, `image_url`, `url`).
- `public static function validationRules(ValidationType $type, ?Model $record)` is implemented
  by every resource model (see SRC.md).
- **Per-role serialization**: resource models override `toArray()` to return a **base set** of fields
  for every authenticated role and add **privileged fields** only for `super-admin`/`admin`/`developer`.
  The role comes from the current user's highest role (`request()->user()->role`, backed by
  `User::getRoleAttribute()`; falls back to `'user'`). All overrides end with
  `$this->mergeArrayableRelations($data)` (from the `Tabling` trait) so eager-loaded relations (e.g.
  `domains` on app/user lists) survive serialization.

## `App` — table `apps`
`#[Fillable(['name', 'package_name', 'summary', 'description', 'logo_id', 'latest_id'])]`
- `$appends` → `logo_url` (via `logo?->url`).
- `$filterable` → `name`, `package_name`, `summary`, `description`.
- **Per-role `toArray()`**: base = `id, name, package_name, summary, description, logo_url,
  latest_id, created_at`; privileged (`super-admin`/`admin`/`developer`) adds `logo_id, updated_at`.
- **Relations**: `logo()` → `belongsTo(File, 'logo_id', 'name')`; `screenshots()` →
  `belongsToMany(File, app_screenshots, app_id, file_id)`; `domains()` →
  `belongsToMany(Domain, app_domains, app_id, domain_id)`; `versions()` → `hasMany(Version, 'app_id')`;
  `latest()` → `belongsTo(Version, 'latest_id', 'id')` (the app's published/latest version).
- **Validation**: create requires `name`, `package_name` (unique on `apps.package_name`), nullable
  `summary`/`description`/`logo` (image file ≤ 2048 KB). Update uses `sometimes`, unique ignores the
  record, and accepts `latest_id => sometimes|nullable|exists:versions,id`.

## `Domain` — table `domains`
`#[Fillable(['name', 'description', 'image_id'])]`
- `$appends` → `image_url`.
- `$filterable` → `name`, `description`.
- **Per-role `toArray()`**: base = `id, name, description, image_url, created_at`; privileged
  (`super-admin`/`admin`/`developer`) adds `image_id, updated_at`.
- **Relations**: `image()` → `belongsTo(File, 'image_id', 'name')`; `users()` →
  `belongsToMany(User, user_domains, domain_id, user_id)`; `apps()` →
  `belongsToMany(App, app_domains, domain_id, app_id)`.
- **Validation**: create requires `name`, nullable `description`/`image`. Update `sometimes`; note the
  update rules include a stray `summary` field (not a real column) — bug.

## `Version` — table `versions`
`#[Fillable(['app_id', 'name', 'changelog', 'status', 'file_id', 'api_key', 'latest_id'])]`
- **Per-role `toArray()`**: base = `id, app_id, name, changelog, status, latest_id, created_at`;
  privileged (`super-admin`/`admin`/`developer`) adds `file_id, url, api_key, updated_at` (the
  download URL and API key are hidden from `user`/`guest`).
- **Relations**: `app()` → `belongsTo(App)`; `file()` → `belongsTo(File, 'file_id', 'name')`;
  `bundles()` → `hasMany(Bundle, 'version_id', 'id')`; `latest()` →
  `belongsTo(Bundle, 'latest_id', 'id')` (the version's active/latest bundle).
- **Validation**: create requires `name`, `changelog`, **`api_key`**, and `file`
  (`file|extensions:apk|max:102400` — the APK installer; extension-only, content not sniffed). Update
  mirrors with `sometimes` (so metadata-only updates work without a file) and accepts
  `latest_id => sometimes|nullable|exists:bundles,id`.
  (Note: `status` is `sometimes|nullable|in:draft,review,published,cancelled` on both; the controller
  defaults a missing `status` to `draft` on create.)

## `Bundle` — table `bundles`
`#[Fillable(['version_id', 'name', 'changelog', 'status', 'file_id'])]`
- `$appends` → `url` (via `file?->url`); `$filterable` → `name`.
- **Per-role `toArray()`**: base = `id, version_id, name, changelog, status, created_at`; privileged
  (`super-admin`/`admin`/`developer`) adds `file_id, url, updated_at`.
- **Relations**: `version()` → `belongsTo(Version, 'version_id', 'id')`; `file()` →
  `belongsTo(File, 'file_id', 'name')`.
- **Validation**: create requires **`name`** (the bundle version string, mirroring `versions.name` —
  `bundle_version` was dropped) and `file` (`file|extensions:zip|max:102400` — **extension-only**,
  archive content is NOT sniffed/validated, uploads are opaque); `changelog` nullable, `status`
  `sometimes|nullable|in:draft,review,published,cancelled`. Update uses `sometimes` with a nullable
  file. The active bundle is selected via `Version::latest()` / `versions.latest_id` (written by
  `BundleController::activate`), not a field on the bundle.

## `File` — table `files`
`#[Fillable(['name', 'disk', 'path'])]`, `#[Hidden(['path', 'created_at', 'updated_at'])]`
- **Non-incrementing string PK**: `$primaryKey = 'name'`, `$keyType = 'string'`, `$incrementing = false`.
  All `*_id` FKs pointing to files actually reference the `name` string.
- `$appends` → `url` = `{host}/files/{name}` (served via the `files.show` web route, see ROUTES.md).
- **Per-role `toArray()`**: base = `name, url`; privileged (`super-admin`/`admin`/`developer`) adds
  `disk, path, created_at, updated_at` (the physical storage `path` is hidden from lower roles).
- `getBase64Attribute()` reads disk content and base64-encodes it (used by controllers for download).
- **Note**: `disk` column exists but `moveFile` hardcodes the `public` disk; a `deleted` event to remove
  the physical file is commented-out TODO.

## `User` — table `users` (NOT `App\Src\Model`)
`#[Fillable(['name', 'login', 'password', 'image_id'])]`, `#[Hidden(['password', 'remember_token'])]`
- Extends `Illuminate\Foundation\Auth\User as Authenticatable` + `implements LdapAuthenticatable`.
- Uses `HasRoles` (Spatie), `AuthenticatesWithLdap`, `Notifiable`, `HasFactory`, `HasApiTokens`,
  `Tabling`, `SoftDeletes`.
- `getAuthPassword()` / `getAuthPasswordName()` return `null` → **password auth disabled** (LDAP only).
- `$appends` → `image_url`, `role`.
- **`getRoleAttribute()`**: returns the user's **highest** role by checking `['super-admin', 'admin',
  'developer', 'user']` in order against `getRoleNames()`; falls back to `'user'`. This is what every
  model's per-role `toArray()` uses to decide privileged fields.
- **Per-role `toArray()`**: base = `id, name, login, image_url, role, created_at`; privileged
  (`super-admin`/`admin`/`developer`) adds `image_id, updated_at`.
- **API payload** (`/auth/me` + `/auth/profile`): serialized by `AuthController::userPayload()` (NOT the
  model's `toArray`) as `{ id, name, login, image_url, roles, permissions }`. `roles` =
  `getRoleNames()`; `permissions` = `getAllPermissions()->pluck('name')` (effective = direct + via role).
  A `super-admin` typically has no direct grants → `permissions` is empty; the frontend uses the role to
  imply all permissions. See AUTH-LDAP.md.
- **Relations**: `image()` → `belongsTo(File, 'image_id', 'name')`; `domains()` →
  `belongsToMany(Domain, user_domains, user_id, domain_id)`.
- **Validation**: only `Update` (`name` sometimes, `image` nullable file). No `Create` case — users are
  LDAP-imported, not created via API.
- **Custom token format**: overrides `createToken()` to produce
  `<id>|<crc32b(entropy)>…` and stores a sha256 hash with a `data` JSON column (see AUTH-LDAP.md).

## `Setting` — table `settings` (plain `Model`)
`#[Fillable(['name', 'value'])]`, string PK `name`, non-incrementing.

## `Device` — table `devices` (OTA client devices)
`#[Fillable(['did', 'user_id', 'manufacturer', 'brand', 'model', 'android_version', 'sdk_version'])]`
- Extends `App\Src\Model` (so `SoftDeletes`/`Tabling`) **and** `use HasApiTokens` — devices authenticate
  with their own Sanctum tokens (required for `$device->createToken(...)`).
- **Relations**: `user()` → `belongsTo(User, 'user_id', 'id')`; `apps()` →
  `belongsToMany(App, device_apps, device_id, app_id)` `->withPivot('version_id', 'bundle_id')
  ->withTimestamps()`.
- **Custom token format**: overrides `createToken()` like `User` (`<id>|<entropy>|<crc32b>` + sha256
  hash + `data` JSON column) — see AUTH-LDAP.md for the shared format.
- No validation rules (devices register themselves via the OTA client, not the admin API).

## `DeviceApp` — table `device_apps` (plain `Model`)
Empty pivot model (`device_id`, `app_id`, `version_id`, `bundle_id`, timestamps). No relations/fillable
declared — used via `Device::apps()`.

## `DownloadHistory` — table `download_histories` (plain `Model`)
`#[Fillable(['device_id', 'user_id', 'target_id', 'target_type'])]` — a download/install audit trail.
- **Relations**: `device()` → `belongsTo(Device)`; `user()` → `belongsTo(User)`; `target()` →
  `morphTo('target', 'target_type', 'target_id')` (polymorphic — currently `Version` or `Bundle`).
- Written by `VersionController::download` / `BundleController::download` (authenticated users).

## Pivot models (plain `Model` + `Tabling`)
- `AppScreenshot` — table `app_screenshots`, `#[Fillable(['app_id', 'file_id'])]`; relations `app()`, `file()`.
- `AppDomain` — table `app_domains`, `#[Fillable(['app_id', 'domain_id'])]`; relations `app()`, `domain()`.
- `UserDomain` — table `user_domains`, `#[Fillable(['user_id', 'domain_id'])]`; relations `user()`, `domain()`.

## `PersonalAccessToken` — table `personal_access_tokens`
Extends `Laravel\Sanctum\PersonalAccessToken`. `#[Fillable([...])]` + casts `data`/`abilities` to JSON.
Registered in `AppServiceProvider` via `Sanctum::usePersonalAccessTokenModel(...)` — required because
`User::createToken()` writes the `data` column.

## `Role` & `Permission` — Spatie package models (`app/Models/Role.php`, `app/Models/Permission.php`)
Extend `Spatie\Permission\Models\Role` / `Spatie\Permission\Models\Permission` (NOT `App\Src\Model`),
adding `Tabling` + `$filterable = ['name']`.
- **Both override `users()`** to hard-code `App\Models\User::class` as the related model. Spatie's default
  resolves the model from the **current default auth guard** (`config('auth.defaults.guard')`), but the
  `auth:sanctum` middleware sets that guard to `sanctum` (which has no provider) during API requests →
  `getModelForGuard()` returns `null` → `morphedByMany(null, ...)` throws "Class name must be a valid
  object or a string" whenever `whereHas('users')` runs (UserTab Security tab, RoleTab users). The
  override keeps the morph pivot (`model_has_roles` / `model_has_permissions`) but always targets
  `App\Models\User`.

## Relationship → join column notes (for `Tabling` joins)
- All `File` relations use the string `name` as the local FK (`logo_id`, `image_id`, `file_id`).
- Many-to-many pivot columns are the singular + `_id`: `app_screenshots(app_id, file_id)`,
  `app_domains(app_id, domain_id)`, `user_domains(user_id, domain_id)`,
  `device_apps(device_id, app_id)` + pivot extras `version_id`, `bundle_id`.
