# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.5.1] - 2026-10-05

### Fixed

- **Form pages no longer shrink the page header.** Every dashboard form page (`AppTab`, `VersionTab`,
  `BundleTab` — create and detail, `DomainTab`, `SettingsTab`) wrapped its entire content in a
  `max-w-2xl` container, so the breadcrumb bar and title were narrowed and centred along with the form.
  The page wrapper is now full width and only the card keeps the width limit, so the header spans the
  content area like it does everywhere else.

## [1.5.0] - 2026-10-05

### Added

- **Forced vs optional updates.** Versions and bundles now carry an `update_type` (`optional`, the
  default, or `force`), set per row in the dashboard. The OTA update check reports it on each offer as
  `availableUpdates.version.updateType` / `availableUpdates.bundle.updateType`, so the client can force
  the user to install instead of offering a "Not now". Backward compatible: older clients ignore the
  field, and a client talking to an older server treats the update as `optional`.
  - New migrations add the column to `versions` and `bundles`; both models expose it in `toArray()` and
    accept it in their validation rules (the rules are the write whitelist). Adds `OtaUpdateTypeTest`.

## [1.4.0] - 2026-10-05

### Added

- **Public app store.** A new public SPA at `/store` (with a detail page at `/store/apps/{id}`) lists
  every app that belongs to a domain flagged **Public** and has at least one published version, and
  installs its published `.apk` — no account required. Domains gain an `is_public` flag (new migration,
  plus a boolean cast, `toArray()` and *both* validation rule sets — the rules are the write whitelist)
  toggled from the domain form under the existing `domain.update` permission. Domains stay private by
  default.
  - **Public JSON API**, unauthenticated and throttled: `GET /api/public/apps` (search, `domain`,
    pagination), `GET /api/public/domains`, `GET /api/public/apps/{app}` and
    `GET /api/public/apps/{app}/download`. `PublicStoreController` builds its own response shapes and
    never returns the version `api_key`, stored file names or filesystem paths.
  - `…/download` streams the app's latest version when published (else the newest published one) and
    records a `DownloadHistory` row.
  - `/store` is the fifth Vite/React entry (`resources/js/apps/store`) with its own Blade shell, and a
    `Store` link in the public site header and footer.

### Changed

- `npm run build` now compiles five SPAs (`home`, `store`, `docs`, `auth`, `dashboard`).

## [1.3.0] - 2026-10-05

### Added

- **`default_bundle_version` is now visible and editable.** The column was fillable but missing from
  `Version::toArray()` and from the version forms, so it never appeared in a response and could not be set
  from the dashboard. The version endpoints now return it, and both the create and edit forms expose a
  "Default bundle version" field. `Version.ts` declares the field as well — the frontend decoder only
  keeps the fields a model lists, so a response key alone would still have been dropped.

### Fixed

- **`default_bundle_version` could never be written through the API.** `VersionController::store` and
  `::update` derive the writable attributes from the model's validation rules
  (`array_diff(array_keys($rules), ['file'])`), and the field was in neither the Create nor the Update
  set. That is what made `/ota-client/v1/app/info` answer `400 "Invalid bundle version"` for a device
  reporting the bundle name embedded in its APK — the case `default_bundle_version` exists to accept.

## [1.2.0] - 2026-10-05

### Added

- **Activate a bundle.** A version's active bundle (`versions.latest_id`) can be chosen from the dashboard:
  `POST /api/app/{app}/version/{version}/bundle/{bundle}/activate` (gated by `permission:bundle.publish`)
  plus an **Activate** action on each inactive row of the bundles table. Nothing could set that pointer
  before — only deleting a bundle cleared it — so which bundle the OTA API reports as
  `availableUpdates.bundle` was not changeable.
- **The version's APK file is visible.** The version header now shows the attached file name
  (`Version 2 · APK: …apk`), and the "Replace APK" field passes the current file so it no longer reads
  "No file chosen" for a version that has one.

### Fixed

- `tests/Feature/BundleTest.php` created versions without `api_key`, which the `versions` table declares
  NOT NULL, so all six of its tests errored before reaching their assertions.

## [1.1.1] - 2026-10-04

### Fixed

- **Profile update silently did nothing.** `User.editProfile` built its payload as
  `{ _method: "PUT", ...data }` where `data` is a `FormData`. A `FormData` has no own enumerable
  properties, so the spread discarded every field and the server only ever received `_method`; `name` is
  validated with `sometimes`, so the request answered `200 "User updated successfully"` while changing
  nothing. The method override is now appended to the `FormData` itself, matching the other models
  (`Version`, `Bundle`, `AppScreenshot`). Covered by `resources/js/models/User.test.ts`.

## [1.1.0] - 2026-10-04

### Added

- **OTA API key authentication** — `/ota-client/v1/app/*` is now authorized by the version's `API-KEY`
  header instead of a Sanctum session. `OtaApiKeyMiddleware` compares it (constant-time) against the bound
  `{version}`/`{bundle}`, or against the `package` + `version` named in the `/app/info` payload, so the
  key is checked before a device is registered. A missing or wrong key returns `401`, and a key only
  reaches the artifacts of its own version. `GET /ota-client/v1/health` stays public.
- **`tests/Feature/OtaApiKeyTest.php`** — first coverage of the OTA surface: missing / wrong / correct key
  on the update check, API-key-only downloads, cross-app key isolation and the public health probe.

### Changed

- Dropped `auth:sanctum` from the OTA download routes and moved `DeviceMiddleware` out of the
  `ota-client` group onto the `/app/*` routes, after the key check. `/app/info` still returns a `session`
  for SDK compatibility, but it is no longer required to download.

### Security

- Removed the live request-attribute dump in `OTAClient\AppController::updateVersion`, which wrote the
  request (including the bearer token) to the application log on every version download.

## [1.0.0] - 2026-10-04

### Added

- **Public site & documentation** — a landing page at `/` and a public **MDX documentation site** at
  `/docs`, served by two new Vite/React apps (`resources/js/apps/home`, `resources/js/apps/docs`) that
  reuse the dashboard theme. The app now has four SPAs (home, docs, auth, dashboard); `welcome.blade.php`
  was removed.
  - **Folder-driven tree** — the sidebar is generated from `content/` (each folder is a section; its
    `index.mdx` is the landing page) with frontmatter `title` / `description` / `order`, collapsible
    nested sections, and a per-page “On this page” TOC.
  - **Shiki** code highlighting with a dual light/dark theme, plus `<Callout>`, `<Steps>` / `<Step>` and
    big **animated** `<Flow>` / `<FlowStep>` diagrams (CSS-only beams and dots).
- **Client SDK docs** — install and usage guides for the [`ota-client`](https://github.com/AbdoPrDZ/react-ota-client)
  React Native package, cross-linked with the server's `/ota-client/v1` API.
- **Docker** — a multi-stage `Dockerfile` (Vite build, then `php:8.4-fpm` with nginx + php-fpm under
  supervisor) and a `docker-compose.yml` stack (app, Postgres, queue worker, scheduler). The entrypoint
  runs migrations and caches config on first boot; uploads and the database persist in named volumes.
  - **`.env.docker.example`** — a dedicated template for the stack (host port, application keys, database
    credentials, LDAP, files, optional mail), gitignored like `.env`.
  - **Docker guide** — a full walkthrough in the README (nav-linked `#docker`) and in the docs site at
    `/docs/guides/docker`: image stages, services, boot sequence, configuration precedence, volumes,
    everyday commands, SQLite, external databases, reverse proxy / TLS, updates and troubleshooting.
- **Brand identity** — custom OTACenter logo mark (broadcast "push" arrow framed by signal brackets on
  an indigo→violet tile) as `resources/js/components/Logo.tsx`, plus `public/favicon.svg` and a `<link
  rel="icon">` in the Blade layout.
- **Hand-built UI primitives** (`resources/js/components/ui/`) — no component library: `Button`, `Card`,
  `Input` / `Textarea` / `Select` / `Field`, `Checkbox` / `Switch`, `Badge`, `Alert`, `Modal` +
  `ConfirmDialog`, `Drawer`, `Dropdown`, `Tabs`, `Tooltip`, `Separator`, `Skeleton` / `Spinner` /
  `Avatar` / `EmptyState`, `SelectMenu` / `MultiSelect` (searchable, keyboard-navigable), toast
  notifications, and a `ThemeProvider` (light / dark / system).
- **Dashboard shell** — collapsible desktop sidebar (state persisted to `localStorage`) with a mobile
  drawer, sticky blurred topbar, breadcrumbs, and a `Ctrl/⌘ K` command palette.
- **Theming** — dark-first CSS-first theme with a persisted light / dark / system toggle applied before
  first paint (no flash).
- **Page scaffolding** — `PageHeader`, `Breadcrumbs`, and `ConfirmDelete`; destructive actions now share
  one confirmation dialog and mutations report success / failure via toasts.
- `CHANGELOG.md`.

### Changed

- **Relicensed under the GNU GPL v3** (`GPL-3.0-or-later`), replacing MIT. `LICENSE` now holds the full
  GPL-3.0 text; `composer.json` declares the SPDX identifier.
- **The compose stack now reads `.env.docker`, not `.env`**, keeping container configuration separate
  from a local development env file. Copy `.env.docker.example` and start it with
  `docker compose --env-file .env.docker up -d --build` (or export `COMPOSE_ENV_FILES=.env.docker`
  once) so Compose interpolates `${APP_PORT}` and the database credentials from the same file the
  containers read.
- **Frontend rebuilt** on plain Tailwind CSS v4 + React. The dashboard, tabs, and auth SPA now use raw
  Tailwind utilities and the primitives above.
- Tables keep the previous rows visible (dimmed, with a progress bar) while refetching, instead of
  swapping to skeletons on every sort, page change, or search.
- Document titles now read `OTACenter — <page>` instead of the previous placeholder.
- Data-table column definitions are memoised, and identical in-flight `GET`s are coalesced into a single
  request (collapses duplicate calls from React StrictMode in development).
- Breadcrumbs on the version and bundle pages show the real app and version names.
- Per-request console logging is now debug-only (`import.meta.env.DEV`, or `VITE_APP_DEBUG=true`).
- Removed the deprecated `baseUrl` from `tsconfig.json` (relative `paths` instead) and fixed a duplicate
  `lib` key, so TypeScript 6/7 editors no longer warn.
- Responsive tables scroll horizontally; the sidebar collapses to an icon rail.

### Fixed

- List requests now always send an explicit `pageSize`. Previously the option and count fetches omitted it,
  and the backend defaults an absent `pageSize` to the **total row count**, so those calls loaded every
  row.
- Home overview counts request `pageSize=5`, respecting the `min:5` table validation rule (a `pageSize=1`
  request was rejected with HTTP 400).
- `.../versions/add` and `.../bundles/add` are static routes that carry no id parameter; the tabs now
  treat a **missing** parameter as create mode instead of comparing against the literal `"add"`.
- `useToast()` returns a safe no-op outside a `ToastProvider` instead of throwing.
- App logo editing is laid out as its own branding row and is clearly disabled for non-privileged roles.
- **Docs internal links** (`/client-sdk/hooks`, …) are routed through the docs SPA, so they stay under
  `/docs` instead of leaving it; external links are marked `target="_blank"` and `#` links stay on page.
- **Docs `#anchors`** now scroll correctly: TOC clicks scroll programmatically, and a fresh load with a
  `#hash` scrolls once the (lazily loaded) MDX has rendered.
- **Docs flow diagrams animate even when `prefers-reduced-motion` is set**, and their motion is more
  prominent (a sweeping beam plus a traveling dot).

### Removed

- shadcn CLI, `@base-ui/react`, `tw-animate-css`, `react-icons`, `embla-carousel-react`, `recharts`,
  and `components.json`.
- The previous shadcn / Base UI frontend (recoverable from git history).
- Raw SQL `query` field from list responses, and the per-search `Log::info` calls in the `Tabling` trait.

### Security

- List endpoints no longer echo the generated SQL back to clients.

## [0.1.0] - Initial project

- Laravel 13 + React 19 platform: apps, versions, bundles, domains, LDAP users, roles and permissions,
  the device-facing OTA client API, statistics, and the admin dashboard.

[1.5.1]: https://github.com/AbdoPrDZ/OTACenter/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/AbdoPrDZ/OTACenter/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/AbdoPrDZ/OTACenter/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/AbdoPrDZ/OTACenter/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/AbdoPrDZ/OTACenter/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/AbdoPrDZ/OTACenter/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/AbdoPrDZ/OTACenter/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/AbdoPrDZ/OTACenter/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/AbdoPrDZ/OTACenter/releases/tag/v0.1.0