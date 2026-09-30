# Database — Migrations, Seeders, Factories

Core tables come from the `2026_07_19_*` migrations. The OTA additions live in `2026_08_08_*`:
`000010_create_versions_table` (versions + `apps.latest_id`), `000013_create_bundles_table`
(bundles + `versions.latest_id`), `000014_create_devices_table` (devices + `device_apps`),
`000015_create_download_histories_table`. Soft deletes are enabled on `files`, `users`, `apps`,
`domains`, `versions`, `bundles`, `devices`.

> Migrations are edited **in place** (no down/up rollback discipline) — a schema change requires a
> fresh `migrate:fresh` on any existing DB; tests auto-migrate the `TEST-OTCenter` Postgres DB.

## Tables

### `files` — string PK `name`
`name` (string PK), `disk` (enum `admin|api|public`, default `public`), `path`, timestamps, softDeletes.
Every `*_id` column referencing a file is a **string** FK → `files.name` (`cascadeOnDelete`).

### `users`
`id`, `guid` (unique nullable), `name`, `login` (unique), `password` (nullable — LDAP users often empty),
`domain` (nullable), `image_id` (nullable → `files.name`), `remember_token`, timestamps, softDeletes.
> ⚠️ There is **no `email` / `email_verified_at`** column, but `database/factories/UserFactory.php`
> (stock Laravel) still defines `email`, `email_verified_at` → creating users with the factory **fails**.

### `settings`
`name` (string PK), `value` (nullable string), timestamps. Key-value store.

### `apps`
`id`, `name`, `package_name` (unique), `summary`, `description`, `logo_id` (→ `files.name`),
timestamps, softDeletes.
`latest_id` is **added later** in the versions migration (nullable, → `versions.id`, `nullOnDelete`).

### `versions`
`id`, `name`, `changelog` (nullable in DB but **required** by validation), `app_id` (→ `apps`, cascade),
`status` enum `draft|review|published|cancelled` (default `draft`), `file_id` (→ `files.name`, **unique**,
**not nullable** — every version must have a file), `api_key` (nullable string in DB but **required** by
validation — e.g. an app-store/bundle API key), timestamps, softDeletes.
`latest_id` is added by the bundles migration (nullable → `bundles.id`, `nullOnDelete`) — the version's
active/latest bundle.

### `bundles`
`id`, `version_id` (→ `versions.id`, cascade), `name` (**NOT NULL** — the bundle version string,
mirroring `versions.name`; the former `bundle_version` column was dropped), `changelog` (nullable),
`status` enum `draft|review|published|cancelled` (default `draft`), `file_id` (string →
`files.name`, **unique**, **not nullable** — each bundle has exactly one stored artifact), timestamps,
softDeletes.

### `devices` & `device_apps` (OTA client)
- `devices` — `id`, `did` (unique, the device identifier from the native client), `user_id` (nullable →
  `users`, `nullOnDelete`), `manufacturer`, `brand`, `model`, `android_version`, `sdk_version`
  (all nullable), timestamps, softDeletes.
- `device_apps` — `id`, `device_id` (→ `devices`, cascade), `app_id` (→ `apps`, cascade),
  `version_id` (→ `versions`, cascade), `bundle_id` (**nullable** → `bundles`, cascade), timestamps.
  Attached by `OTAClient\AppController::info` via `syncWithoutDetaching`.

### `download_histories`
`id`, `device_id` (nullable → `devices`, `nullOnDelete`), `user_id` (nullable → `users`, `nullOnDelete`),
`target_type` + `target_id` (`morphs('target')` — currently `Version`/`Bundle`), timestamps.
Written by `VersionController::download` / `BundleController::download` (⚠️ not routed yet).

### Pivots
- `app_screenshots` — `id`, `app_id`, `file_id` (string → `files.name`), unique(`app_id`,`file_id`).
- `user_domains` — `id`, `user_id`, `domain_id`, unique pair.
- `app_domains` — `id`, `app_id`, `domain_id`, unique pair.
- `device_apps` — see above.
- `personal_access_tokens` — stock Sanctum schema (+ used `data` JSON column by custom token).
- Spatie `permission_tables` — stock (`roles`, `permissions`, `model_has_roles`, etc.).

## Seeders
- `DatabaseSeeder` → calls **`SecuritySeeder` only**.
- `SecuritySeeder` → creates roles `super-admin`, `admin`, `developer`, `user`, `guest` and the
  permission matrix (see AUTH-LDAP.md). Idempotent (`firstOrCreate`).
- `FakeDataSeeder` → `App::factory()->count(20)->create()` — **not called** by `DatabaseSeeder`.

## Factories
- `AppFactory` — `name`, unique `package_name`, `summary`, `description`, `logo_id => null`. Usable.
  `description`/`summary` are length-capped (`realText(150)` / `sentence(6)`) so they fit the
  varchar(255) columns.
- `UserFactory` — stock Laravel template (uses `email`/`email_verified_at`) — **stale**, breaks on insert
  against the current `users` schema. Needs updating to `login`/`guid` (and hashing not needed since
  password auth is disabled).

## Schema/model mismatches (verify/fix before relying)
| Item | Migration | Model / validation |
|------|-----------|--------------------|
| Version `changelog` | nullable | validation `required` |
| Version `api_key` | nullable | validation `required` |
| Version `file_id` | required + unique | update rule is `sometimes` → file replacement is optional (metadata-only updates OK) |
| User factory | no `email` column | factory defines `email`/`email_verified_at` |

> The former `latest_version_id` ↔ `latest_id`, `exists:app_versions`, and `active_bundle_id` ↔
> `latest_id` mismatches are **resolved**: the columns are now `latest_id` on both `apps` and `versions`
> (added by the versions/bundles migrations), the App update rule is `exists:versions,id`, and bundle
> activation writes `versions.latest_id`.
