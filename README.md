<h1 align="center">OTACenter</h1>

<p align="center">
  <b>Self-hosted Over-The-Air application distribution &amp; management platform.</b><br>
  Publish apps, manage versioned installers, and control per-domain access via your LDAP directory.
</p>

<p align="center">
  <a href="#stack">Stack</a> •
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick start</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#api">API</a> •
  <a href="#testing">Testing</a> •
  <a href="#project-layout">Layout</a>
</p>

---

## Stack

| Layer | Technology |
|-------|------------|
| Backend | Laravel 13, PHP 8.3+ |
| Auth | LDAPRecord (`directorytree/ldaprecord-laravel`) + Laravel Sanctum |
| Authorization | Spatie Permissions (roles + per-route permission middleware) |
| Frontend | React 19, TypeScript, Vite 8 |
| Styling | Tailwind CSS v4 (CSS-first, single stylesheet) |
| Components | Base UI primitives, TanStack Table, Recharts, Lucide, shadcn/ui conventions |
| Storage | Local disk (configurable), SQLite / MySQL / PostgreSQL |
| Tests | PHPUnit 12 (backend), Vitest + Testing Library (frontend) |

There are two SPAs: an **admin dashboard** (`/dashboard`) and an **auth page** (`/auth`), both served by
plain Blade entry points that boot React. There is no Inertia — the Blade views are just shells.

---

## Features

### App & release management
- **Apps** — name, unique package name, summary, description, logo, and a screenshot gallery.
- **Versions** — a release of an app, each with a changelog, a status
  (`draft` / `review` / `published` / `cancelled`), an API key, and a **required** `.apk` installer.
- **Bundles** — a ZIP artifact attached to a version. Exactly one bundle is *active* per version
  (`versions.latest_id`); one version is *latest* per app (`apps.latest_id`). "Publish" is simply
  pointing `latest_id` at the resource.
- **Files** — every uploaded artifact (logos, images, APKs, ZIPs) is a row in `files` with a
  **non-incrementing string primary key** and a public URL served by `GET /files/{name}`.

### Access control
- **LDAP authentication** — users are imported from the directory on first login
  (`userprincipalname` → `login`, `cn` → `name`). No usable password is stored for LDAP users.
- **Domains** — organizational groupings. Apps are bound to domains, users are bound to domains, and a
  user sees an app if any of their domains is bound to it.
- **RBAC** — five seeded roles (`super-admin`, `admin`, `developer`, `user`, `guest`) and a permission
  matrix (`app.*`, `version.*`, `bundle.*`, `screenshot.*`, `domain.*`, `user.*`, `role.*`,
  `permission.*`). Every protected route carries a `permission:{name}` middleware; `super-admin`
  bypasses all of them. Frontend mirrors this with `can({ permission })` / `can({ roles })`.
- **Per-role serialization** — models return a base field set to every authenticated role, and add
  privileged fields (storage `path`, download `url`, `api_key`, `updated_at`) only for
  `super-admin` / `admin` / `developer`.
- **Invites** — admins generate a registration link plus a separate activation code; the link is bound
  to a one-time Sanctum token with the `user.invite` ability.

### Device / OTA client API
A separate, device-facing API is mounted at `/ota-client/v1` for native clients:
- `GET /ota-client/v1/health` — reachability check.
- `POST /ota-client/v1/app/info` — body `{ package, version, bundle }`; resolves the app/version/bundle
  and reports `availableUpdates`. Devices self-register via the `X-Device-Info` header
  (`did`, `mf`, `br`, `mdl`, `av`, `sdv`) through `DeviceMiddleware`.

### Statistics
Read-only aggregates (`/api/statistics/*`, gated by `role:super-admin,admin`): global totals with
status breakdowns, plus per-entity panels embedded as inner tabs on every model page.

### Dashboard
Desktop sidebar + mobile drawer shell, server-driven data tables with debounced search, server-side
sort and pagination, and permission-gated actions throughout.

---

## Quick start

### Requirements
- PHP **8.3+** with `ldap`, `zip`, and `fileinfo` extensions
- Composer 2
- Node.js 20+ and npm
- A reachable LDAP/Active Directory server (or a local user with a password, see below)

### Install

```bash
composer run setup
```

This runs `composer install`, creates `.env` from `.env.example`, generates the app key, runs
migrations, installs npm packages, and builds the frontend.

### Configure

Copy the LDAP and super-admin values into `.env` (see [Configuration](#configuration)), then seed:

```bash
php artisan db:seed
```

`DatabaseSeeder` runs `SecuritySeeder` (roles + permissions) and `SuperAdminSeeder`, which **requires**
`APP_SUPER_ADMIN_LOGIN` and `APP_SUPER_ADMIN_PASSWORD` to be set.

### Run

```bash
composer run dev
```

Starts, concurrently: `php artisan serve`, the queue listener, `pail` logs, and the Vite dev server.
The dashboard is at `http://localhost:8000/dashboard`.

> Tip: SQLite is the default database and works out of the box. `.env.example` also carries commented
> MySQL/PostgreSQL blocks.

---

## Configuration

### Application

| Key | Notes |
|-----|-------|
| `APP_NAME`, `APP_URL`, `APP_ENV`, `APP_DEBUG` | Standard Laravel app settings. |
| `VITE_APP_URL` | Base for the frontend axios instance; defaults to same-origin + `/api`. |
| `DB_CONNECTION` | `sqlite` (default) or your MySQL/PostgreSQL DSN. |
| `APP_SUPER_ADMIN_LOGIN` / `APP_SUPER_ADMIN_PASSWORD` | Required by `SuperAdminSeeder`. |

### LDAP

Users are resolved from the directory; these values are read by `config/ldap.php`.

| Key | Default |
|-----|---------|
| `LDAP_CONNECTION` | `default` |
| `LDAP_HOST` | `127.0.0.1` |
| `LDAP_PORT` | `389` |
| `LDAP_BASE_DN` | `dc=local,dc=com` |
| `LDAP_USERNAME` | `cn=user,dc=local,dc=com` |
| `LDAP_PASSWORD` | — |
| `LDAP_TIMEOUT` | `5` |
| `LDAP_TLS` / `LDAP_STARTTLS` / `LDAP_SASL` | `false` |
| `LDAP_LOGIN_SUFFIX` | Appended to the typed login before the LDAP search (e.g. `@corp.local`) |
| `LDAP_LOGGING` / `LDAP_CACHE` | `true` / `false` |

### Local (non-LDAP) login

`AuthController::login` is **local-first**: if a `users` row with a matching `login` has a bcrypt
password, that login wins; otherwise it falls through to LDAP. This is how the super-admin account and
the test suite authenticate without a directory server.

---

## API

Two JSON surfaces:

| Prefix | Auth | Purpose |
|--------|------|---------|
| `/api/*` | Sanctum SPA session or bearer token | Admin API (defined in `routes/web.php` under a `prefix('api')` group) |
| `/ota-client/v1/*` | Sanctum + `DeviceMiddleware` | Device-facing OTA API (`routes/ota_client.php`) |
| `/files/{name}` | none | Streams a stored artifact from the `public` disk |

Every admin response uses the same envelope:

```jsonc
{
  "success": true,
  "message": "Items retrieved successfully",
  "items": [ /* ... */ ],
  "itemsCount": 12,
  "pagesCount": 2,
  "page": 1
}
```

List endpoints accept `page`, `pageSize`, `search`, `sort[<field>]=asc|desc`, and `filter[<field>]`
— all validated and applied server-side by the `Tabling` trait.

<details>
<summary><b>Admin route map</b></summary>

| Prefix | Operations |
|--------|-----------|
| `/api/auth` | `POST /login`, `POST /register` (invite token), `GET /me`, `PUT /profile`, `DELETE /logout` |
| `/api/app` | index, store, show, update, destroy, `/{app}/screenshot/*`, `/{app}/domain/*` (bind/unbind), `/{app}/version/*` |
| `/api/app/{app}/version/{version}/bundle` | index, store, show, update, destroy, `/{bundle}/activate` |
| `/api/domain` | index, store, show, update, destroy |
| `/api/user` | index, show, destroy, `POST /invite`, `/{user}/role/*`, `/{user}/permission/*`, `/{user}/domain/*` |
| `/api/role` | index, show, `/{role}/permission/*`, `/{role}/user` (index) |
| `/api/statistics` | `general`, `byUser`, `byRole`, `byDomain`, `byApp`, `byVersion` — all `role:super-admin,admin` |

</details>

---

## Testing

```bash
composer test          # or: php artisan test     (PHPUnit feature tests)
npm test               # vitest run               (React component + util tests)
npm run test:watch     # watch mode
```

Backend tests live in `tests/Feature` and cover auth, RBAC matrices (role × endpoint), and CRUD for
apps, domains, versions, bundles, and users. Frontend tests use Vitest + Testing Library with jsdom and
live next to the code they cover.

---

## Project layout

```
app/
  Src/                    Base Controller / Model / ValidationType
  Http/Controllers/       Admin API controllers
  Http/Controllers/OTAClient/   Device-facing endpoints
  Http/Middleware/        permission, role, rec.parent, device, file access
  Ldap/User.php           LDAP model mapping
  Models/                 App, Version, Bundle, Domain, User, File, Device, …
  Models/Traits/Tabling   Server-side sort / search / filter / paginate pipeline
resources/js/
  apps/auth/              Auth SPA
  apps/dashboard/         Dashboard SPA, shell components, and tabs
  components/             Shared components + ui/ primitives
  models/                 Typed frontend models (createModel factory)
  utils/                  axios bootstrap, Request wrapper, router, RBAC helpers
resources/css/app.css     The single Tailwind v4 stylesheet
routes/
  web.php                 SPA shells, file serving, and the admin JSON API
  ota_client.php          Device API (mounted at /ota-client)
database/migrations/      Schema; seeders for roles, permissions, and the super admin
tests/                    PHPUnit feature tests
.agents/context/          Architecture docs for backend and frontend
```

### Conventions worth knowing

- **Validation lives on the model.** Every resource implements
  `validationRules(ValidationType $type, ?Model $record)`; controllers just run the `Validator`.
- **Every list endpoint is one call.** `Model::tablingCollect($request, ...)` handles joins, sorting,
  search, filtering, pagination, and relation loading.
- **Tailwind is v4, CSS-first.** There is no `tailwind.config.js` and no `postcss.config.js`. Theme
  tokens live in the `@theme` blocks in `resources/css/app.css`. Do not add v3
  `@tailwind base/components/utilities` directives — they silently break preflight and all theme colors.
- **Base UI, not Radix.** UI primitives are built on `@base-ui/react/*` with the `render` prop for
  polymorphism, and every component sets a `data-slot` attribute.

---

## Security notes

If you deploy this publicly, review these before exposing it:

- `AuthController::login` logs full credentials at INFO level — remove that before production.
- `.env` is gitignored; never commit credentials.
- `AuthController::logout` revokes **all** of the user's tokens, not just the current one.
- The `pageSize` list parameter is unbounded and defaults to the full row count — consider capping it
  for large datasets.
- The `Tabling` response includes the raw SQL in a `query` field — a debug leftover worth removing.

---

## License

[MIT](LICENSE) — as declared in `composer.json`.
