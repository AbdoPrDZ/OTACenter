<h1 align="center">OTACenter</h1>

<p align="center">
  <b>Self-hosted Over-The-Air application distribution &amp; management platform.</b><br>
  Publish apps, manage versioned installers, and control per-domain access via your LDAP directory.
</p>

<p align="center">
  <a href="#stack">Stack</a> •
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick start</a> •
  <a href="#docker">Docker</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#api">API</a> •
  <a href="#docs">Docs</a> •
  <a href="#testing">Testing</a> •
  <a href="#project-layout">Layout</a> •
  <a href="CHANGELOG.md">Changelog</a>
</p>

---

## Stack

| Layer | Technology |
|-------|------------|
| Backend | Laravel 13, PHP 8.3+ |
| Auth | LDAPRecord (`directorytree/ldaprecord-laravel`) + Laravel Sanctum |
| Authorization | Spatie Permissions (roles + per-route permission middleware) |
| Frontend | React 19, TypeScript, Vite 8 |
| Styling | Tailwind CSS v4 (CSS-first, single stylesheet), dark-first with light/system toggle |
| Components | Hand-built Tailwind primitives, TanStack Table, Lucide icons |
| Docs | MDX + Shiki (via Vite), served as an SPA at `/docs` |
| Storage | Local disk (configurable), SQLite / MySQL / PostgreSQL |
| Tests | PHPUnit 12 (backend), Vitest + Testing Library (frontend) |

There are four SPAs — a public **home** (`/`), an MDX **docs** site (`/docs`), an **auth** page
(`/auth`) and the **admin dashboard** (`/dashboard`) — each served by a plain Blade shell that boots
React. There is no Inertia; the Blade views are just shells.

---

## Features

### App & release management
- **Apps** — name, unique package name, summary, description, logo, and a screenshot gallery.
- **Versions** — a release of an app, each with a changelog, a status
  (`draft` / `review` / `published` / `cancelled`), an API key, and a **required** `.apk` installer.
- **Bundles** — a ZIP artifact attached to a version. The version's *active* bundle is stored on
  `versions.latest_id`, and an app's *latest* version on `apps.latest_id` (set from the app form).
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
  and reports `availableUpdates`. The version's `API-KEY` header authorizes the call — no login session is
  required. Devices register via the `X-Device-Info` header
  (`did`, `mf`, `br`, `mdl`, `av`, `sdv`) through `DeviceMiddleware`.

### Statistics
Read-only aggregates (`/api/statistics/*`, gated by `role:super-admin,admin`): global totals with
status breakdowns, plus per-entity panels embedded as inner tabs on every model page.

### Dashboard
A dark-first, responsive shell: collapsible desktop sidebar with a mobile drawer, sticky topbar with
breadcrumbs, a `Ctrl/⌘ K` command palette, light/dark/system theme toggle, and toasts. Content is built
from server-driven data tables (debounced search, server-side sort and pagination, column visibility)
with permission-gated actions throughout.

<a id="docs"></a>

### Public site & docs
A landing page at `/` and a public **MDX documentation site** at `/docs`, both sharing the dashboard's
theme and tokens.

- **Content lives in `resources/js/apps/docs/content/`.** The sidebar tree is generated from the folder
  structure: each folder is a section whose `index.mdx` is its landing page, and nested folders nest
  further. Frontmatter (`title`, `description`, `order`) controls labels and ordering.
- **Collapsible, nested sidebar** plus a per-page “On this page” table of contents.
- **Shiki** code highlighting with a dual light/dark theme, driven by the same `.dark` class as the app.
- **MDX components**: `<Callout>`, numbered `<Steps>` / `<Step>`, and big animated `<Flow>` / `<FlowStep>`
  diagrams (CSS-only beams and dots).
- Internal links and `#anchors` are handled inside the docs SPA, so they stay under `/docs`.

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
The public home is at `http://localhost:8000/`, the docs at `/docs`, and the dashboard at `/dashboard`.

> Tip: SQLite is the default database and works out of the box. `.env.example` also carries commented
> MySQL/PostgreSQL blocks.

### Docker

A production image and compose stack ship with the repo. Follow the **[Docker guide](#docker)** for the
full walkthrough — first run, services, environment, volumes, upgrades and troubleshooting.

```bash
cp .env.docker.example .env.docker                   # required: compose loads it as env_file
docker compose --env-file .env.docker up -d --build   # http://localhost:8000
```

---

<a id="docker"></a>

## Docker

OTACenter ships with everything needed to run it as a container set: a multi-stage `Dockerfile`, a
`docker-compose.yml` stack, and the runtime config under `docker/`. Nothing else — no `.dockerignore`
exceptions, no host-side tooling.

### How it fits together

```
                 ┌──────────────────────────────┐
   :8000 ───────▶│  app  (nginx + php-fpm 8.4)  │──────▶ storage volume
                 └──────────────┬───────────────┘        (uploads, sessions, views)
                                │
                          ┌─────▼─────┐   ┌────────────┐   ┌───────────┐
                          │    db     │   │   queue    │   │ scheduler │
                          │ Postgres16│   │ queue:work │   │schedule:work
                          └───────────┘   └────────────┘   └───────────┘
                                db volume
```

- **The image is built in two stages.** Stage 1 (`node:20-alpine`) runs `npm ci && npm run build` to
  produce `public/build`. Stage 2 (`php:8.4-fpm` — Symfony 8.1 in `composer.lock` requires ≥ 8.4.1)
  installs Composer deps with `--no-dev` and copies the app plus the built assets.
- **PHP extensions** are compiled in: `pdo_pgsql`, `pdo_mysql`, `pdo_sqlite`, `zip`, `ldap`, `bcmath`,
  `mbstring`, `curl`, `pcntl`, `opcache`.
- **One container, two processes.** The default command runs `supervisord`, which supervises **nginx**
  (serving `public/`, proxying PHP to php-fpm on `127.0.0.1:9000`) and **php-fpm**. Uploads are capped at
  512 MB in both `docker/nginx/default.conf` and `docker/php.ini`.
- **Logs go to stderr** (`LOG_CHANNEL=stderr`, `error_log=/proc/self/fd/2`), so everything shows up in
  `docker compose logs`.

### Requirements

Docker Engine 24+ with the Compose v2 plugin. Check with `docker compose version`.

### First run

```bash
# 1. Copy the Docker env template (the stack reads .env.docker, not .env).
cp .env.docker.example .env.docker

# 2. Fill in the values the app needs (LDAP + the first super admin).
#    APP_URL must match how users reach the app, e.g. https://ota.example.com
#    APP_SUPER_ADMIN_LOGIN / APP_SUPER_ADMIN_PASSWORD are required by the seeder.

# 3. Build and start (first run compiles assets and vendor deps).
docker compose --env-file .env.docker up -d --build

# 4. Seed roles, permissions and the super-admin account.
docker compose --env-file .env.docker exec app php artisan db:seed
```

Tired of the flag? Export it once per shell — Compose then reads `.env.docker` for everything:

```bash
echo 'export COMPOSE_ENV_FILES=.env.docker' >> ~/.bashrc   # or your shell's rc file
```

Open `http://localhost:8000` (home), `/docs` (documentation) and `/dashboard` (login as the seeded
super-admin). `GET /up` is Laravel's built-in health endpoint.

### Services

| Service | Role | Notes |
|---------|------|-------|
| `app` | nginx + php-fpm | Publishes `${APP_PORT:-8000}:80`. Runs migrations on boot, then caches config and views. Healthcheck: `curl http://127.0.0.1/`. |
| `db` | `postgres:16-alpine` | Waits via `pg_isready`; the `app` starts only after it is healthy. Data in the `otacenter-db` volume. |
| `queue` | `queue:work --tries=3 --timeout=300` | Uses the `database` queue driver; waits for `app` to be healthy so the `jobs` table exists. |
| `scheduler` | `schedule:work` | Keeps `php artisan schedule:run` alive. Inert unless you schedule tasks. |

`app` is the only service that needs a published port — the workers run entirely inside the Compose
network.

### What happens on boot

`docker/entrypoint.sh` runs before every container's command:

1. Copies `.env.example` to `.env` if no file was provided.
2. Runs `php artisan key:generate` when `APP_KEY` is unset (so sessions and encrypted cookies work).
3. Creates the writable `storage/framework/*`, `storage/logs` and `bootstrap/cache` directories and
   chowns them to `www-data`.
4. Runs `php artisan storage:link` so `GET /files/{name}` can serve uploads.
5. Runs `php artisan migrate --force`, retrying for ~60s while the database settles (skip with
   `RUN_MIGRATIONS=false`, as the workers do).
6. Clears the config cache, and in `APP_ENV=production` re-caches config and compiled views.
7. Hands off to the service command.

The queue worker and scheduler share the same image and entrypoint but run `RUN_MIGRATIONS=false` and
`command:` overrides instead of `supervisord`.

### Environment

The stack reads **`.env.docker`** (gitignored), never `.env`. That file plays two roles:

1. **Container environment** — it is passed to every PHP container as `env_file`, so `LDAP_*`,
   `APP_SUPER_ADMIN_*`, `FILESYSTEM_DISK` and the optional `MAIL_*` keys reach the app.
2. **Compose interpolation** — with `--env-file .env.docker` (or `COMPOSE_ENV_FILES`), `${APP_PORT}`
   and the `${DB_*}` values in the compose file resolve from it too, so the app and the bundled
   Postgres service can never disagree.

Values in a service's `environment:` block then **override** the file, so `APP_ENV`, `APP_DEBUG`,
`LOG_CHANNEL`, `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `SESSION_DRIVER`, `CACHE_STORE`,
`QUEUE_CONNECTION` and `RUN_MIGRATIONS` are owned by `docker-compose.yml` — change those there, not
in `.env.docker`.

| Variable | Default | Notes |
|----------|---------|-------|
| `APP_PORT` | `8000` | Host port mapped to the container's port 80. |
| `APP_URL` | `http://localhost:8000` | Public base URL — used for redirects and Sanctum stateful domains. |
| `APP_KEY` | generated on boot | Set it to keep sessions and encrypted cookies stable across rebuilds. |
| `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` | `otacenter` / `otacenter` / `secret` | Applied to both the Laravel app and the Postgres service. |
| `RUN_MIGRATIONS` | `true` (`false` for `queue`/`scheduler`) | Set on a one-off command to skip `migrate`. |
| `LDAP_*` | see [Configuration](#configuration) | Reachable from inside the network — use `host.docker.internal` for a directory on the Docker host. |
| `APP_SUPER_ADMIN_LOGIN` / `APP_SUPER_ADMIN_PASSWORD` | — | Required once for `db:seed`. |

Because production boots with a cached config, **edit `.env.docker` and recreate** rather than expecting
a live reload:

```bash
docker compose --env-file .env.docker up -d --force-recreate app queue scheduler
```

> **Note:** `VITE_*` keys have no effect in the containers — the frontend is compiled into
> `public/build` during `docker build`, not at request time.

### Persistent data

| Volume | Mount | Contents |
|--------|-------|----------|
| `otacenter-storage` | `/var/www/html/storage` | Uploaded APKs, logos, screenshots, bundle ZIPs, plus sessions, cached views and logs. |
| `otacenter-db` | `/var/lib/postgresql/data` | The PostgreSQL data directory. |

Uploaded artifacts are stored on the `public` disk and served by `GET /files/{name}`. Back up the
storage volume together with the database — the two are only half of a restore.

### Everyday commands

```bash
docker compose --env-file .env.docker up -d --build   # build (if needed), then start everything
docker compose ps                                    # status and health
docker compose logs -f app                           # follow application + nginx/php-fpm logs
docker compose exec app bash                         # shell inside the running container
docker compose exec app php artisan <cmd>             # run an artisan command
docker compose restart app                           # restart one service
docker compose down                                  # stop and remove containers (volumes survive)
docker compose down -v                               # stop and delete the volumes too (destructive)
```

The `--env-file` flag only matters for commands that **create** containers; `ps`, `logs`, `exec`,
`restart` and `down` work without it.

For one-off artisan commands, prefer `run` over `exec` so you do not depend on a live container:

```bash
docker compose --env-file .env.docker run --rm app php artisan config:clear
```

### Using SQLite instead of Postgres

Comment out the `db` service, add `DB_CONNECTION=sqlite` to the `environment:` blocks, and mount a
volume at `/var/www/html/database` so the database file survives rebuilds:

```yaml
app:
  environment:
    DB_CONNECTION: sqlite
  volumes:
    - otacenter-storage:/var/www/html/storage
    - otacenter-database:/var/www/html/database
```

### Using an existing database

Drop the `db` service and point the app at your server from `.env.docker` (`DB_HOST`, `DB_PORT`,
`DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`) plus `DB_CONNECTION` in the compose file. The app service
waits on `db` today, so remove its `depends_on` too.

### Behind a reverse proxy or TLS

The container listens on plain HTTP port 80 and is meant to sit behind a reverse proxy (Caddy, nginx,
Traefik, a cloud load balancer). Terminate TLS upstream and set `APP_URL` to the external `https://` URL.
If you terminate TLS elsewhere, note that no proxies are trusted by default — add
`$middleware->trustProxies(...)` in `bootstrap/app.php` so rate limiting and Sanctum see real client IPs,
and confirm your proxy forwards `X-Forwarded-*` headers.

### Updating to a new build

```bash
git pull
docker compose --env-file .env.docker up -d --build   # rebuilds assets + deps, recreates containers
docker compose --env-file .env.docker exec app php artisan migrate --force
```

### Troubleshooting

| Symptom | Fix |
|---------|-----|
| Your `.env.docker` edits are ignored | Add `--env-file .env.docker` (or export `COMPOSE_ENV_FILES`) so Compose interpolates from it. |
| `port is already allocated` | Change `APP_PORT` in `.env.docker`, or pass one inline: `APP_PORT=8080 docker compose up -d`. |
| App container exits during boot | Read the migrations loop output; a failing migration restarts 30 times, then exits. Inspect `docker compose logs app`. |
| `No application encryption key` | Set `APP_KEY` in `.env.docker`, or let the entrypoint generate one — then clear caches. |
| Cannot reach an LDAP server on the Docker host | Use `host.docker.internal` as `LDAP_HOST` (Linux: add `extra_hosts: ["host.docker.internal:host-gateway"]`). |
| Workers crash-loop on a fresh database | The `jobs` table lives in the database; the workers wait for `app` to finish migrating. Check `docker compose logs queue`. |
| `.env.docker` changes appear to be ignored by the app | Production caches config. `docker compose --env-file .env.docker up -d --force-recreate app queue scheduler`. |
| Uploads fail with `413` or `post_max_size` | Raise `client_max_body_size` in `docker/nginx/default.conf` and the `upload*` values in `docker/php.ini`, then rebuild. |

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
| `/ota-client/v1/*` | `API-KEY` (version key) + `DeviceMiddleware` | Device-facing OTA API (`routes/ota_client.php`) |
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
| `/api/app/{app}/version/{version}/bundle` | index, store, show, update, destroy |
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
  apps/home/              Public landing SPA (/)
  apps/docs/              MDX documentation SPA (/docs) + content/
  apps/auth/              Auth SPA (login, register)
  apps/dashboard/         Dashboard SPA: index, router, shell components/, tabs/
  components/             Shared components (SiteHeader, Logo, PageHeader, ModelDataTable, …)
  components/ui/          Hand-built primitives (Button, Modal, Dropdown, SelectMenu, …)
  models/                 Typed frontend models (createModel factory)
  utils/                  axios bootstrap, Request wrapper, router, RBAC helpers
resources/css/app.css     The single Tailwind v4 stylesheet (theme tokens + palettes)
resources/views/          Blade shells: layout, home, docs, dashboard, auth
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
- **UI is built in-house.** Components come from the hand-written primitives in
  `resources/js/components/ui/`, written with raw Tailwind utilities. No shadcn, no Base UI, no Radix.
  Style them with the semantic tokens (`bg-card`, `text-muted-foreground`, `bg-primary`, `border-border`,
  …) so light/dark switching is automatic.
- **Always send an explicit `pageSize`.** The `Tabling` trait falls back to the *total row count* when
  `pageSize` is absent, so a count or option fetch without it loads every row. Note `pageSize` must be
  at least `5`.

---

## Security notes

If you deploy this publicly, review these before exposing it:

- `AuthController::login` logs full credentials at INFO level — remove that before production.
- `.env` is gitignored; never commit credentials.
- `AuthController::logout` revokes **all** of the user's tokens, not just the current one.
- The `pageSize` list parameter has no upper bound (minimum `5`) — consider capping it for large datasets.

---

## License

[GPL-3.0-or-later](LICENSE) — full text in [`LICENSE`](LICENSE), as declared in `composer.json`.
