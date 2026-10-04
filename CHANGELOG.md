# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/AbdoPrDZ/OTACenter/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/AbdoPrDZ/OTACenter/releases/tag/v0.1.0