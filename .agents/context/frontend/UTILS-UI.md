# Frontend Utils — UI & Navigation Layer

Reference for the frontend utilities that deal with UI concerns (class merging, responsive behavior,
file picking, routing). These live in `resources/js/lib`, `resources/js/hooks`, and parts of
`resources/js/utils`.

## Contents
- [General conventions](#general-conventions)
- [UI helpers](#ui-helpers)
- [Styling](#styling)
- [Routing & navigation](#routing--navigation)

---

## General conventions

- Path alias `@/` → `resources/js/`.
- UI utilities are pure-client helpers with no API/backend dependency.
- The **API + modelization layer** (axios bootstrap, `Request`, `Model`/`createModel`, field decoding)
  is documented separately in [UTILS-API.md](./UTILS-API.md).
- One file spans both layers: `utils/bootstrap.ts` — it sets up the global axios instance (API), imports
  the app stylesheet, AND exports file-picker helpers (UI). The UI parts and the stylesheet are
  documented here, the axios setup in UTILS-API.md.

---

## UI helpers

### `lib/utils.ts` — `cn`
- **Exported**: `function cn(...inputs: ClassValue[]): string`.
- **Purpose**: Merge Tailwind class names with conflict resolution. The single most-used helper in the
  codebase; every `components/ui/*` component calls it.
- **Implementation**: `twMerge(clsx(inputs))` — `clsx` for conditional classes, `tailwind-merge` to
  dedupe/override conflicting Tailwind utilities.
- **Props**: accepts anything `clsx` accepts (strings, arrays, objects, falsy values).
- **Usage**: `cn("base-class", isActive && "active-class", props.className)`.

### `hooks/use-mobile.ts` — `useIsMobile`
- **Exported**: `function useIsMobile(): boolean`.
- **Purpose**: Reactive "is this a mobile (narrow) viewport?" flag using `matchMedia`.
- **Key details**: `MOBILE_BREAKPOINT = 768`. Returns `true` when `window.innerWidth < 768`. Initial
  state is `undefined` → coerced to `false` via `!!isMobile` until the first effect run (one frame
  after mount). Listens to media-query changes and cleans up on unmount.
- **Consumers**: `Layout.tsx` (decides whether to render the desktop `SideMenu`), `Sidebar` (drives the
  mobile Sheet drawer path), `SidebarMenuButton` (tooltip visibility).
- **Usage**: `const isMobile = useIsMobile();`.

### `utils/bootstrap.ts` — file pickers (UI part)
> The axios bootstrap half of this file is documented in UTILS-API.md.
- **Exported**: `selectFile(contentType, multiple?)`, `pickImage(multiple?)`, `pickImages()`.
- **Purpose**: Programmatic file-input helpers for choosing files/images from the browser.
- **Details**:
  - `selectFile(contentType: string, multiple = false): Promise<File[] | undefined>` — creates a
    hidden `<input type="file">`, sets `accept`/`multiple`, clicks it; resolves `File[]` on change,
    `undefined` on abort/cancel.
  - `pickImage(multiple = false): Promise<File | undefined>` — wraps `selectFile` with
    `"image/png, image/jpeg, image/gif"` and returns the first file.
  - `pickImages(): Promise<File[] | undefined>` — same accept list, `multiple = true`.
- **Usage**: avatar/logo upload (`pickImage()`), screenshot galleries (`pickImages()`), then POST via a
  model's `create/update` with multipart.
- **Note**: `bootstrap.ts` also has the side effect `import "../../css/app.css"` at the top — see
  [Styling](#styling) below.

---

## Styling

### `resources/css/app.css` — the single stylesheet
- **Loaded by**: `resources/js/utils/bootstrap.ts` (line 1), which every SPA entry imports. This is the
  **only** stylesheet the auth + dashboard SPAs load. `welcome.blade.php` also `@vite`s it directly.
- **Tailwind version is v4** (`tailwindcss` + `@tailwindcss/vite` in `vite.config.js`). There is
  **no `tailwind.config.js` and no `postcss.config.js`** — all configuration is CSS-first.
- **Structure**:
  - `@import 'tailwindcss'` (v4 entry — replaces the v3 `@tailwind base/components/utilities` trio),
    plus `tw-animate-css`, `shadcn/tailwind.css`, `@fontsource-variable/oxanium`.
  - `@custom-variant dark (&:is(.dark *))` — the `dark:` variant is **class-based**, driven by a `.dark`
    class on an ancestor (not `prefers-color-scheme`).
  - `@source` globs for Blade views so Tailwind scans them.
  - `@theme` → `--font-sans`; `@theme inline` → the full `--color-*` / `--radius-*` token map that every
    `bg-background` / `text-foreground` / `bg-primary` / `border-input` utility resolves against.
  - `:root` and `.dark` → the oklch colour palettes those tokens point at.
  - `@layer base` → global border/outline, `body` colours, `html` font + font-smoothing.
  - Custom `::-webkit-scrollbar` rules at the end.

> ⚠️ **Do not add `@tailwind base; @tailwind components; @tailwind utilities;` anywhere.** Those are
> Tailwind **v3** directives. Under v4 `@tailwind base` and `@tailwind components` silently emit nothing
> (so you lose preflight entirely) while `@tailwind utilities` still emits generic utilities — the result
> is a page with working layout but **no colours, no borders, no reset, and no `dark:` variant**, i.e. an
> all-white unstyled app. Use `@import 'tailwindcss'`.
>
> *History (2026-08-08):* the SPA used to import a second, v3-syntax stub at `resources/js/styles/index.css`
> that had no `@theme` block, which caused exactly that white-page symptom. That file was deleted and
> `bootstrap.ts` now imports `resources/css/app.css`; the stub's scrollbar and font-smoothing rules were
> folded into `app.css`. Its `:root { font-family: "Inter" }` override was **dropped**, so the theme's
> `--font-sans` (`'Oxanium Variable'`) now applies — note `layout.blade.php` still preloads Inter from
> Google Fonts, which is now unused.

---

## Routing & navigation

### `utils/router.tsx` — `Router` (base class)
- **Exported**: `default class Router`.
- **Purpose**: Declarative, named-route system built on top of `react-router`'s
  `createBrowserRouter`. Subclasses declare `static routes` (named `Route` objects) and override
  `static getRoutes()` to return the JSX route tree. See `apps/dashboard/router.tsx` for the concrete
  subclass.
- **Types** (`types/router.ts`): `Route = { name?: string; path: string; title?: string; params?: Record<string, string> }`.
- **Static API**:
  | Member | Signature | Behavior |
  |--------|-----------|----------|
  | `routes` | `static Route[]` | Route table; overridden in subclasses |
  | `current` | `static get Route` | Computes current route from `window.location.pathname` via `getByPath` (also fills `params` from `:param` segments) |
  | `get(name, params?, th?)` | `(name, params?, th=true) => Route` | Lookup by name; `params` merged into a copy; throws if missing and `th` |
  | `getPath(name, params?, th?)` | `(...) => string \| undefined` | `get()` then `parseRoutePath()` (replaces `:key` with param values) |
  | `getByPath(path, th?)` | `(path, th=true) => Route` | Segment-wise match supporting `:param` parts; throws if missing and `th` |
  | `getRoutes()` | `() => ReactNode` | Abstract; throws `"Not implemented"` — subclasses define the `<Route>` tree |
  | `listen(listener)` | `(from, to) => void` | Register navigation listener (also available as instance method) |
  | `load()` | `() => DataRouter` | Creates `createBrowserRouter(createRoutesFromElements(this.getRoutes()))`, subscribes to navigation, sets initial current, returns the router |
- **Instance API**: `current`, `listen`, `load` delegate to the static methods (instance keeps `this.constructor` typing).
- **Key details**:
  - `onNavigate` updates `_current`, sets `document.title` to `` `Stock Manager - ${to.title}` `` (note: **hardcoded "Stock Manager"** prefix — leftover branding), and notifies listeners.
  - `_listeners` is a static array; no unsubscribe is provided.
  - `getCurrent()` falls back to `{ name: "", path: window.location.pathname }` when unmatched.
- **Usage**: subclass sets `static routes` + `static getRoutes()`, then `Router.load()` is passed to the
  app root (see `apps/dashboard/router.tsx`).

### `apps/dashboard/router.tsx` — DashboardRouter (concrete example)
- **Exported**: `default class extends Router`.
- **Purpose**: The dashboard's route table and lazy route tree; the canonical example of the `Router` API.
- **Routes** (name → path → title):
  | name | path | title |
  |------|------|-------|
  | `dashboard` | `/dashboard` | — |
  | `home` | `/dashboard/home` | Home |
  | `apps` | `/dashboard/apps` | Apps |
  | `app.add` | `/dashboard/apps/add` | Add App |
  | `app.show` | `/dashboard/apps/:id` | App Details |
  | `app.version.add` | `/dashboard/apps/:id/versions/add` | Add Version |
  | `app.version.show` | `/dashboard/apps/:id/versions/:versionId` | Version Details |
  | `app.version.bundle.add` | `/dashboard/apps/:id/versions/:versionId/bundles/add` | Add Bundle |
  | `app.version.bundle.show` | `/dashboard/apps/:id/versions/:versionId/bundles/:bundleId` | Bundle Details |
  | `domains` | `/dashboard/domains` | Domains |
  | `domain.add` | `/dashboard/domains/add` | Add Domain |
  | `domain.show` | `/dashboard/domains/:id` | Domain Details |
  | `users` | `/dashboard/users` | Users |
  | `user.show` | `/dashboard/users/:id` | User Details |
| `roles` | `/dashboard/roles` | Roles |
| `role.show` | `/dashboard/roles/:id` | Role Details |
| `permissions` | `/dashboard/permissions` | Permissions |
| `permission.show` | `/dashboard/permissions/:id` | Permission Details |
| `statistics` | `/dashboard/statistics` | Statistics |
| `settings` | `/dashboard/settings` | Settings |
- **Key details**: `getRoutes()` wraps every tab in `React.lazy(...)` + `<React.Suspense fallback={<RouteLoading />}>` inside a parent `<Route path="/dashboard" element={<Layout />}>`; index route `<Navigate to={getPath("home")!} replace />`. `NAV_ITEMS.activeNames` (see COMPONENTS.md) correspond to these route names. `app.version.*` / `app.version.bundle.*` are rendered by `VersionTab` / `BundleTab` (lazy), which branch on `useParams()` (`versionId`/`bundleId` === `"add"` → create). ⚠️ `getByPath` is **first-match** and ignores arity — the static `app.version.add` / `app.version.bundle.add` routes MUST stay declared **before** the dynamic `...:versionId` / `...:bundleId` siblings, otherwise `add` is captured as a dynamic id.
- **Access control is centralized, not per-route**: `Layout` computes `can(getRouteAccess(route.name))`
  and renders `<Forbidden />` when unauthorized. The per-route `ROUTE_ACCESS` map lives in
  `components/navigation.ts` (permission/role per route name) and nav visibility is filtered with
  `can(item.access)` in `SideMenu`/`AppNavbar`. See COMPONENTS.md (`navigation.ts`, `Layout`) and
  UTILS-API.md (`utils/permissions.ts`).
- **Consumers**: `SideMenu`, `AppNavbar`, `UserMenu`, `Header` all call
  `DashboardRouter.getPath("home" | "settings" | ...)`, and `Layout` uses `DashboardRouter.current` +
  `DashboardRouter.listen`.
