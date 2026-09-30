# Agent Guidelines for OTACenter

## Overview & Architecture
OTACenter is a Laravel application with a React 19 frontend built using Vite and Tailwind CSS v4.

- **Backend Framework:** Laravel 13 (PHP 8.3+)
- **Frontend Framework:** React 19 + TypeScript + Vite
- **UI Components:** Tailwind CSS v4, Lucide React, Base UI (`@base-ui/react/*`)
- **Authentication & Security:** Laravel Sanctum, LDAPRecord (`directorytree/ldaprecord-laravel`), Spatie Permissions

---

## Project Context Docs (`.agents/context/`)

The `.agents/context/` folder holds the authoritative explainers for this codebase. **Read the relevant
doc before exploring or changing code** instead of re-deriving everything from scratch:

- `backend/INDEX.md` — backend doc map + gotchas. Sub-docs: `SRC.md` (base `Controller`/`Model`/`ValidationType`),
  `TABLING.md`, `MODELS.md`, `CONTROLLERS.md`, `ROUTES.md`, `AUTH-LDAP.md`, `DATABASE.md`, `TESTS.md`.
- `frontend/COMPONENTS.md` — every React component (global, `ui/` primitives, dashboard shell).
- `frontend/UTILS-UI.md` — UI & navigation utils (`cn`, `useIsMobile`, file pickers, `Router`/`DashboardRouter`)
  **and the Tailwind v4 styling setup** (`resources/css/app.css`).
- `frontend/UTILS-API.md` — API layer & modelization (axios bootstrap, `Request`, `Model`/`createModel`, frontend models).
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
  - `apps/dashboard/` - Main dashboard SPA & tabs (`HomeTab`, `AppsTab`/`AppTab`, `DomainsTab`/`DomainTab`, `UsersTab`, `RolesTab`/`RoleTab`, `PermissionsTab`/`PermissionTab`, `StatisticsTab`, `SettingsTab`)
    - `components/` - Dashboard shell: `Layout`, `SideMenu`, `AppNavbar`, `Header`, `UserMenu`
  - `apps/auth/` - Authentication UI
  - `components/` - Shared React components (UI components, `ModelDataTable`, `Form`, `RouteLoading`, `navigation.ts`)
  - `models/` - Frontend data model definitions
  - `utils/` - Frontend HTTP, router, and field utilities
- `resources/css/app.css` - **The single Tailwind v4 stylesheet** (theme tokens, oklch palettes, `dark`
  variant, preflight). Imported by `resources/js/utils/bootstrap.ts`, which every SPA entry pulls in.
- `resources/views/` - Blade layout templates (`welcome`, `dashboard`, `auth`, `layout`)
- `config/` - Includes `ldap.php` (LdapRecord) and `permission.php` (Spatie)

---

## Current State: Dashboard Shell

The dashboard layout uses a **"mobile drawer + desktop sidebar"** scheme (confirmed choice). Detailed
architecture, component roles, and conventions are in `frontend/COMPONENTS.md`; routing in `frontend/UTILS-UI.md`
(`Router`/`DashboardRouter`).

Quality status:
- `npm run build` passes; shell files typecheck clean (`npx tsc --noEmit`).
- `tsconfig.json` uses `"ignoreDeprecations": "5.0"` (installed TypeScript is 5.9.x).
- Pre-existing, not-yet-fixed TS errors live in `apps/auth/index.tsx`, `components/Form.tsx`, and
  `ui/scroll-area.tsx` — unrelated to the shell.

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
   Use `@import 'tailwindcss'`. See `frontend/UTILS-UI.md` → Styling.
4. **Database & Migrations:** Always create structured migration files for schema changes.
