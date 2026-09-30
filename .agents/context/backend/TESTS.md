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
- `RoleBindingTest::test_attach_and_detach_user_to_role` — posts to `POST /role/{role}/user/{user}`, which
  is **not** in the router (role↔user binding is `POST/DELETE /user/{user}/role/{role}`) → 404. The test
  targets a route that doesn't exist.
- `RoleAccessTest` — 3 data sets fail with 404 for the same reason:
  "admin can attach user to role" (200 expected), "developer cannot attach user to role" (403 expected),
  "developer cannot detach user from role" (403 expected) — all post to the nonexistent
  `/role/{role}/user/{user}`; attach/detach routes live under `/user/{user}/role/{role}` and aren't in
  the matrix.
- Current status (last full-ish run of the four resource files — `VersionTest`, `BundleTest`,
  `RoleAccessTest`, `SuperAdminAccessTest`): **88 passed / 3 failed** (the RoleAccessTest rows above).
  `BundleTest|VersionTest` alone: **9 passed**.

