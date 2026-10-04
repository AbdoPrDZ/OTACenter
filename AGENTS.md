# Agent Guidelines for OTACenter

## Overview & Architecture
OTACenter is a Laravel application with a React 19 frontend built using Vite and Tailwind CSS v4.

- **Backend Framework:** Laravel 13 (PHP 8.3+)
- **Frontend Framework:** React 19 + TypeScript + Vite
- **UI Components:** Tailwind CSS v4 with hand-built React primitives (no component library), Lucide React
- **Authentication & Security:** Laravel Sanctum, LDAPRecord (`directorytree/ldaprecord-laravel`), Spatie Permissions

---

## Project Context Docs (`.agents/context/`)

The `.agents/context/` folder holds the authoritative explainers for this codebase. **Read the relevant
doc before exploring or changing code** instead of re-deriving everything from scratch:

- `backend/INDEX.md` — backend doc map + gotchas. Sub-docs: `SRC.md` (base `Controller`/`Model`/`ValidationType`),
  `TABLING.md`, `MODELS.md`, `CONTROLLERS.md`, `ROUTES.md`, `AUTH-LDAP.md`, `DATABASE.md`, `TESTS.md`.
- `frontend/INDEX.md` — frontend doc map + stack + directory map + ground rules.
- `frontend/DESIGN.md` — design system: theme tokens, `app.css`, dark-first theming, layout shell.
- `frontend/COMPONENTS.md` — every React component (UI primitives, shared components, dashboard shell, tabs).
- `frontend/NAVIGATION.md` — `Router`/`DashboardRouter`, the route table, nav config, access control.
- `frontend/DATA.md` — API layer & modelization (axios bootstrap, `Request`, `Model`/`createModel`, models, permissions).
- `frontend/TESTS.md` — Vitest/Testing Library setup, commands, and conventions.

Keep these docs up to date when making significant structural changes, and add new explainers for new areas.

---

## Domain Understanding

OTACenter is an **Over-The-Air (OTA) application distribution & management platform**. Administrators publish
mobile/desktop apps, attach versioned builds, and control which users (from an internal LDAP directory) can
access which apps, scoped by organizational **domains**.

Core entities: `App` (logo, screenshots, versions, domains), `Version` (a build of an app; `file` installer),
`Domain` (organizational grouping scoping access), `User` (LDAP directory user), `File` (stored artifact,
**PK is `name` (string, non-incrementing)**, served via `GET /files/{name}`).

See `backend/MODELS.md` for tables/relations/validation and `backend/ROUTES.md` for the full API surface
(JSON API under `/api`, Sanctum-auth except `POST /auth/login`).

---

## Directory Structure
- `app/` - Core PHP application logic (Models, Controllers, Middleware, Providers, LDAP integration)
  - `app/Src/` - Base `Model`, `Controller`, and `ValidationType` enums shared by all resources
  - `app/Ldap/User.php` - LDAP model mapping
- `routes/` - API (`api.php`), web (`web.php`), channels, console routing definitions
- `database/` - Migrations, seeders, and factories
- `resources/js/` - React frontend source code
  - `apps/dashboard/` - Main dashboard SPA & tabs (`HomeTab`, `AppsTab`/`AppTab`, `DomainsTab`/`DomainTab`, `UsersTab`/`UserTab`, `RolesTab`/`RoleTab`, `PermissionsTab`/`PermissionTab`, `VersionTab`, `BundleTab`, `StatisticsTab`, `SettingsTab`)
    - `components/` - Dashboard shell: `Layout`, `Sidebar`, `Topbar`, `UserMenu`, `CommandPalette`
  - `apps/auth/` - Authentication UI (`index.tsx`, `register.tsx`, `AuthShell.tsx`)
  - `components/` - Shared React components + hand-built `ui/` primitives (Button, Input, Modal, Dropdown, `SearchableSelect`, …), `ModelDataTable`, `PageHeader`, `navigation.ts`
  - `models/` - Frontend data model definitions
  - `utils/` - Frontend HTTP, router, and field utilities
- `resources/css/app.css` - **The single Tailwind v4 stylesheet** (theme tokens, oklch palettes, `dark`
  variant, preflight). Imported by `resources/js/utils/bootstrap.ts`, which every SPA entry pulls in.
- `resources/views/` - Blade layout templates (`welcome`, `dashboard`, `auth`, `layout`)
- `config/` - Includes `ldap.php` (LdapRecord) and `permission.php` (Spatie)

---

## Current State: Dashboard Shell

The frontend was **rebuilt from scratch** (2026) with a plain Tailwind CSS v4 + React design — **no
shadcn, no Base UI, no component library**. It is **dark-first** (indigo accent) with a light/system
toggle, a collapsible desktop sidebar + mobile drawer, a topbar with breadcrumbs + a `Ctrl/⌘ K` command
palette, toasts, and a hand-built primitive set. Architecture is in `frontend/COMPONENTS.md`, design
system in `frontend/DESIGN.md`, routing in `frontend/NAVIGATION.md`, data layer in `frontend/DATA.md`.

The `resources-old/` directory is a **frozen fallback copy of the previous (shadcn/Base UI) UI** — kept
for reference, never imported.

Quality status:
- `npm run build`, `npx tsc --noEmit`, and `npm test` (31 tests) all pass.
- `resources/` was recreated; `vite.config.js`, `tsconfig.json`, and `vitest.config.js` already point at it.
- Removed unused deps: `shadcn`, `@base-ui/react`, `tw-animate-css`, `react-icons`,
  `embla-carousel-react`, `recharts` (and `components.json`).

---

## Commands & Workflows

### Setup & Installation
```bash
composer run setup
```

### Development
```bash
composer run dev
```
*Note: `composer run dev` runs Laravel serve, queue listener, pail logs, and Vite dev server concurrently.*

### Testing
```bash
composer test
# or
php artisan test
```

### Frontend Testing
```bash
npm test           # run once (vitest run)
npm run test:watch # watch mode
```
See `frontend/TESTS.md` for setup and conventions.

### Build Frontend
```bash
npm run build
```

---

## Code & Quality Conventions
1. **PHP/Laravel:** Follow PSR-12 and standard Laravel conventions. Use `laravel/pint` for formatting if needed.
2. **TypeScript/React:**
   - Prefer functional components and hooks.
   - Ensure explicit type imports where applicable.
   - Use Lucide icons and Tailwind v4 CSS utility classes.
3. **Styling (Tailwind v4):** configuration is **CSS-first** — there is no `tailwind.config.js` and no
   `postcss.config.js`. Add theme tokens to the `@theme` / `@theme inline` blocks in `resources/css/app.css`,
   and keep that as the only stylesheet. **Never use the v3 `@tailwind base/components/utilities` directives**
   — under v4 they silently drop preflight and all theme colours, producing an all-white unstyled app.
   Use `@import 'tailwindcss'`. **Build UI from the hand-written primitives in `components/ui/` — do not add
   shadcn/Base UI/other component libraries.** See `frontend/DESIGN.md`.
4. **Database & Migrations:** Always create structured migration files for schema changes.
