# Tests — Conventions

PHPUnit feature tests (namespace `Tests\Feature`). Run with `composer test` or `php artisan test`.

## Base setup (`tests/TestCase.php`)
Every test:
1. `migrate:fresh` + `db:seed` (seeds `SecuritySeeder`).
2. Creates a local test user login `test_user`, name `Test User`, password `password` (bcrypt)
   (`User::firstOrCreate`), which makes password login work in tests via the local `Hash::check` branch
   (LDAP is bypassed because the user has a local password).
3. Helpers:
   - `getToken()` → `$user->createToken('test')->plainTextToken`.
   - `authHeaders()` → `['Authorization' => 'Bearer <token>']`.

## Test style
- JSON API calls: `$this->withHeaders($this->authHeaders())->getJson/postJson/putJson/deleteJson(...)`.
- Assertions: `assertOk()`, `assertJsonPath('success', true)`, `assertJsonPath('item.<field>', ...)`,
  `assertJsonStructure([...])`, plus DB asserts `assertDatabaseHas/Missing`, `assertSoftDeleted`,
  `assertDatabaseCount`.
- List tests always hit the `Tabling` endpoint with `?page=1` and assert `itemsCount`.
- File uploads: `Storage::fake('public')` + `UploadedFile` built from a `tempnam()` file (see
  `AppTest::test_screenshot_routes_...`), or `post()` (non-JSON) for multipart.

## Coverage & gaps
- `AuthTest` — login returns token, `me`, profile update, logout revokes tokens.
- `AppTest` — index/store/show/update/destroy, screenshot store/list/delete, app-domain index.
- `UserTest` — show/destroy, user-domain index.
- `DomainTest`, `VersionTest` — exist (read them for specifics).
- `VersionTest` — index/store/show/destroy under an app. `store` posts `name`, `changelog`, **`api_key`**
  (now a required field) and a **real `.apk`-named upload** (`UploadedFile` built from `tempnam()`, MIME
  `application/vnd.android.package-archive`) — the `extensions:apk` rule only checks the extension.
- `BundleTest` — index/store/show/activate/destroy, nested under app→version. `store` requires `name`
  (the bundle version string, now NOT NULL) and uploads a **fake `.zip`-named file** (random bytes via
  `tempnam()`), not a real archive — the `extensions:zip` rule only checks the extension, so content is
  irrelevant. `activate`/`destroy` assert on `versions.latest_id` being set / nulled. Includes a
  rejection case proving the `rec.parent` middleware returns 404 when a bundle belongs to a different
  version.
- `OtaStaleVersionTest` — the device API when the installed `version` is not a row of the app (old APK /
  unpublished build): the check still returns the `app.latest` update, is authorized by that version's
  key (wrong key rejected **before** the device is registered), skips the `device_apps` link, and reports
  `versionId: null`. Also covers the listed-version rules (`default_bundle_version`, registered bundle,
  unknown bundle rejected) and an app with no current version.
- `tests/Feature/Rbac/SuperAdminAccessTest` — adversarial baseline for the most-privileged role. Positive
  paths (full app/domain/bundle CRUD, domain bind) + negative "crack" tests that **must not be allowed
  even for a superadmin**: 401 unauthenticated, 400 validation bypasses (duplicate `package_name`,
  non-image logo, non-`.zip` bundle, missing required fields), 404 cross-app/cross-version IDOR
  (`rec.parent`), 404 missing/negative/non-numeric ids. Role helpers live on `TestCase`:
  `createUser(login, roles)`, `headersFor(user)`, `superAdminHeaders()`. The version-create positive
  test posts `api_key` and `fakeUpload('apk')` (an `.apk`-named file — `png` would fail the
  `extensions:apk` rule).
- `tests/Feature/Rbac/RoleAccessTest` — role × endpoint matrix (53 data sets) verifying permission
  enforcement for `guest`/`user`/`developer`/`admin`/`super-admin` across every resource route
  (`domain.*`, `user.*`, `app.*`, `screenshot.*`, `version.*`, `bundle.*`, domain bindings). Data provider
  `accessMatrix()`; success rows use real valid payloads (including fake png/zip uploads). The version
  create row posts `api_key` (now required).

## Known-broken / pre-existing failures
- `AuthTest::test_login_returns_a_token_for_the_seeded_user` — 500 "Session store not set on request":
  `AuthController::login` calls `$request->session()` but the `api` group has no session middleware.
- Role↔user binding is routed both ways (`POST/DELETE /role/{role}/user/{user}` and
  `/user/{user}/role/{role}`), so `RoleBindingTest` and the role-binding `RoleAccessTest` rows pass.
- `versions.api_key` is NOT NULL: any fixture that calls `Version::create([...])` directly (e.g.
  `RoleAccessTest::seedFixtures()`, the `SuperAdminAccessTest` version helper) **must set `api_key`**, or
  every test using it errors with a not-null violation.
- Tests share one Postgres DB (`TEST-OTCenter`, from `phpunit.xml`; it must already exist) and every
  test runs `migrate:fresh`, so **never run two test processes at once** — they drop each other's
  tables (`relation "migrations" does not exist`, `relation "cache" already exists`).
- `tests/Feature/Rbac/SecurityRegressionTest` — one test per hole closed in the 2026-11 security review
  (role-hidden `api_key`, private build artifacts on `/files`, super-admin protection, self-delete,
  review ownership, no `?token=`, login throttle, `pageSize` cap, no device registration for an unknown
  package). Tests that act as several users call `$this->app['auth']->forgetGuards()` between requests
  (helper `actingWith()`), otherwise the guard keeps the first user.
- `FileChecksumTest` — checksum set on create / upload, `null` when the file is missing, migration
  backfill (re-runs the migration's `down()`/`up()`), OTA `availableUpdates.*.checksum` + download header.
- `DownloadLinkTest` — create (self / for another user needs `user.view` / plain user 403 / invalid
  expiry), token download of a private app counted for the link's user, no-token download (private 404,
  public anonymous), wrong-app / unknown / revoked / expired tokens, and statistics split with/without
  token.
- Current status: full suite **181 passed** (2026-11-02).

