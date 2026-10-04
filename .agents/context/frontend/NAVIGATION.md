# Frontend Navigation & Routing

## `utils/router.tsx` — `Router` (base)

Declarative named-route system over `react-router-dom`'s `createBrowserRouter`. Subclasses set
`static routes: Route[]` and override `static getRoutes()`.

| Static | Behaviour |
|--------|-----------|
| `current` | Computes the active `Route` from `window.location.pathname` (fills `params` from `:param` segments). |
| `get(name, params?, th?)` | Lookup by name; merges `params` into a copy. |
| `getPath(name, params?, th?)` | `get()` then `parseRoutePath()` (replaces `:key` with values). |
| `getByPath(path, th?)` | First-match segment match supporting `:param` parts. |
| `getRoutes()` | Abstract — subclass returns the `<Route>` tree. |
| `listen(listener)` | Register a `(from, to)` navigation listener (no unsubscribe). |
| `load()` | Creates the browser router, subscribes, returns it. |

`onNavigate` updates `_current`, sets `document.title` to `OTACenter — {title}` (or `OTACenter`), and
notifies listeners.

> **Gotcha:** `getByPath` is first-match and ignores arity, so the static `.../add` routes must be
> declared **before** the dynamic `.../versions/:versionId` siblings.

## `apps/dashboard/router.tsx` — `DashboardRouter`

| name | path | title |
|------|------|-------|
| `home` | `/dashboard/home` | Home |
| `apps` | `/dashboard/apps` | Apps |
| `app.add` | `/dashboard/apps/add` | Add App |
| `app.show` | `/dashboard/apps/:id` | App Details |
| `app.version.add` | `/dashboard/apps/:id/versions/add` | Add Version |
| `app.version.show` | `/dashboard/apps/:id/versions/:versionId` | Version Details |
| `app.version.bundle.add` | `/dashboard/apps/:id/versions/:versionId/bundles/add` | Add Bundle |
| `app.version.bundle.show` | `/dashboard/apps/:id/versions/:versionId/bundles/:bundleId` | Bundle Details |
| `domains` / `domain.add` / `domain.show` | … | Domains |
| `users` / `user.show` | … | Users |
| `roles` / `role.show` | … | Roles |
| `permissions` / `permission.show` | … | Permissions |
| `statistics` | `/dashboard/statistics` | Statistics |
| `settings` | `/dashboard/settings` | Settings |

`getRoutes()` wraps every tab in `React.lazy` + `<React.Suspense fallback={<RouteLoading/>}>` inside a
parent `<Route path="/dashboard" element={<Layout/>}>` with an index redirect to `home`.

> **Important:** the `.../add` pages are static routes and carry **no** `:id`/`:versionId`/`:bundleId`
> param. Tabs must treat a missing param as create mode (`if (!versionId || versionId === "add")`), *not*
> compare against the literal `"add"`.

## `components/navigation.ts`

- **`NAV_ITEMS`** — `{ name, label, description, icon, activeNames, group: "general"|"settings", access? }`
  for Home, Apps, Domains, Users, Roles, Permissions, Statistics, Settings.
- **`ROUTE_ACCESS`** — route name → `RouteAccess` (`{ permission?, roles? }`), mirroring the backend
  middleware. `home`/`settings` → `{}` (always allowed); `statistics` → `{ roles: ["super-admin","admin"] }`.
- **`isNavActive(item, route)`** — `item.activeNames.includes(route.name)`.
- **`getRouteAccess(name?)`** — lookup with `{}` fallback.

## Access control

Centralized: `Layout` computes `can(getRouteAccess(route.name))` and renders `<Forbidden/>` instead of the
tab when denied. Nav visibility is filtered with `can(item.access)` in `Sidebar`/`CommandPalette`
(mobile drawer reuses `Sidebar`). Action buttons/forms gate on specific permissions via `can({ permission })`.
