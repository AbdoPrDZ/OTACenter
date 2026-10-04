# Frontend Components

Every React component under `resources/js`. All primitives are hand-built with Tailwind utilities —
there is **no** shadcn/Base UI/Radix.

## Contents
- [Conventions](#conventions)
- [UI primitives (`components/ui/`)](#ui-primitives-componentsui)
- [Shared components (`components/`)](#shared-components-components)
- [Dashboard shell (`apps/dashboard/components/`)](#dashboard-shell-appsdashboardcomponents)
- [Dashboard tabs (`apps/dashboard/tabs/`)](#dashboard-tabs-appsdashboardtabs)
- [Auth SPA (`apps/auth/`)](#auth-spa-appsauth)

---

## Conventions

- Path alias `@/` → `resources/js/`.
- Class merging via `cn()` (`@/lib/utils`, `clsx` + `tailwind-merge`).
- Variants via `cva` (`class-variance-authority`) where a component has multiple looks/sizes.
- Icons are `lucide-react`; sizes are set by the component (`[&_svg]:size-4`) or explicitly.
- Interactive primitives set `data-slot="..."` and use semantic tokens (`bg-card`, `text-muted-foreground`,
  `border-border`, `bg-primary`, `ring-ring`).
- No `"use client"` directives (not Next.js).

---

## UI primitives (`components/ui/`)

| File | Exports | Notes |
|------|---------|-------|
| `button.tsx` | `Button`, `buttonVariants` | `variant`: default, secondary, outline, ghost, soft, destructive, link. `size`: sm, default, lg, icon, icon-sm, icon-lg. `loading` prop swaps in a spinner. Native `<button>` (defaults `type="button"`); use `buttonVariants()` for link-styled anchors. |
| `card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` | Rounded `xl`, `border-border`, `shadow-sm`. |
| `form.tsx` | `Label`, `Input`, `Textarea`, `Select`, `FieldGroup`, `Field`, `FieldLabel`, `FieldContent`, `FieldDescription`, `FieldError` | `Input`/`Textarea` style `aria-invalid` red. `Select` is a styled native `<select>` with a chevron. `FieldError` accepts `children` or an `errors` array. |
| `checkbox.tsx` | `Checkbox`, `Switch` | Custom-styled native inputs (peer-based). `Checkbox` supports `indeterminate` and `onCheckedChange(boolean)`. |
| `badge.tsx` | `Badge`, `badgeVariants`, `statusVariant` | `variant`: default, primary, success, warning, info, destructive, outline. `statusVariant(status)` maps version/bundle statuses. |
| `alert.tsx` | `Alert`, `AlertTitle`, `AlertDescription` | `variant`: default, destructive, success, warning, info (icon + tinted border). |
| `modal.tsx` | `Modal`, `ModalContent`, `ModalHeader`, `ModalTitle`, `ModalDescription`, `ModalFooter`, `ConfirmDialog` | Portal modal, scroll-lock, Escape/backdrop dismiss, auto-focus. `ConfirmDialog` is the ready-made confirm (used by `ConfirmDelete`). |
| `drawer.tsx` | `Drawer`, `DrawerHeader`, `DrawerBody`, `DrawerClose` | Side sheet (`side="left"|"right"`), portal + slide animation. Mobile nav uses it. |
| `dropdown.tsx` | `Dropdown`, `DropdownItem`, `DropdownLabel`, `DropdownSeparator`, `DropdownCheckboxItem` | Trigger is any node via the `trigger` prop; menu portals with fixed positioning (repositions on scroll/resize, flips when near the viewport bottom). Items close on click. |
| `tabs.tsx` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | Context-based, controlled or uncontrolled (`value`/`defaultValue`). `TabsContent` unmounts when inactive. |
| `tooltip.tsx` | `Tooltip` | CSS-only on hover/focus-within (`side`), used by the collapsed sidebar. |
| `feedback.tsx` | `Spinner`, `Skeleton`, `Avatar`, `EmptyState` | `Avatar` falls back to initials; `EmptyState` is the dashed placeholder with optional icon/action. |
| `select-menu.tsx` | `SelectMenu`, `MultiSelect`, `SelectOption` | The **lazy select** replacement for shadcn's Combobox: portal popover with client-side search, keyboard nav (↑/↓/Enter), single-select (`SelectMenu`, optional `clearable`) and multi-select with removable chips (`MultiSelect`). Options: `{ value, label, description?, disabled? }`. |
| `separator.tsx` | `Separator` | `orientation="horizontal"|"vertical"`. |
| `toast.tsx` | `ToastProvider`, `useToast` | Bottom-right portal stack. `useToast()` → `{ toast, success, error }`; safe no-op when there is no provider (used in tests). |
| `theme.tsx` | `ThemeProvider`, `ThemeToggle`, `useTheme` | Class-based dark/light/system theme, persisted to `localStorage`. |

---

## Shared components (`components/`)

- **`ModelDataTable.tsx`** — server-driven table. Props: `model` (needs `all()` + optional
  `getDataTableColumns()`), `url`, `columns`, `pageSize`/`pageSizeOptions`, `enableSearch` (default true),
  `enableSorting`, `enableColumnVisibility`, `enableRowSelection`, `searchPlaceholder`, `emptyMessage`,
  `actions(row)`, `onRowClick(row)`, `requestKey` (re-fetch trigger), `className`. Uses TanStack Table
  with **fully manual** sort/pagination; search debounce is **800 ms** (one fetch after the last
  keystroke). Skeleton rows while loading; `EmptyState` when empty. Rows add `cursor-pointer` with
  `onRowClick`, and an actions column is appended when `actions` is provided.
- **`PageHeader.tsx`** — title + description + optional breadcrumbs/`icon`/`actions`.
- **`Breadcrumbs.tsx`** — `Crumb[]` (`{ label, to? }`) with `Link` for non-last items.
- **`ConfirmDelete.tsx`** — destructive `ConfirmDialog` wrapper; `onConfirm` returns a `Response`,
  fires a toast, then calls `onDeleted`. Optional custom `trigger`.
- **`ImagePicker.tsx`** — dashed tile that calls `pickImage()`; shows preview/`value`, `onChange(file)`.
- **`DomainTags.tsx`** — domain chips with optional `max` (overflow → `+N`).
- **`StatisticsViews.tsx`** — `StatCard`, `StatusBreakdown`, and per-entity panels `UserStats`,
  `RoleStats`, `DomainStats`, `AppStats`, `VersionStats` (embedded as inner Statistics tabs).
- **`InviteDialog.tsx`** — invite form (`name`, `email`, role `SelectMenu`, optional domain `SelectMenu`)
  → `User.invite`, then shows the copyable registration link. Optional custom `trigger`.
- **`RouteLoading.tsx`** / **`Forbidden.tsx`** / **`ErrorAndRedirect.tsx`** — lazy-route fallback,
  access-denied panel, and error+auto-redirect panel.
- **`navigation.ts`** — `NAV_ITEMS`, `isNavActive`, `ROUTE_ACCESS`, `getRouteAccess` (see NAVIGATION.md).

---

## Dashboard shell (`apps/dashboard/components/`)

- **`Layout.tsx`** — fixed `h-dvh` shell. Holds `route` (from `DashboardRouter.current` + `listen`),
  `collapsed` (persisted) and `mobileOpen` state; enforces route access with
  `can(getRouteAccess(route.name))` → renders `<Forbidden/>` when denied; renders `<Outlet/>`.
- **`Sidebar.tsx`** — desktop `<aside>` (collapsible icon rail) + mobile `<Drawer>`. Brand, grouped nav
  (General/Settings) filtered by `can(item.access)`, active indicator, and a footer user dropdown
  (Settings / Sign out). Collapsed items show a `Tooltip`.
- **`Topbar.tsx`** — mobile hamburger, desktop collapse toggle, breadcrumbs/title, command-palette
  button, `ThemeToggle`, `UserMenu`. Registers `Ctrl/⌘ K`.
- **`UserMenu.tsx`** — avatar dropdown (Settings / Sign out).
- **`CommandPalette.tsx`** — `Ctrl/⌘ K` palette listing accessible `NAV_ITEMS`, keyboard navigable.

---

## Dashboard tabs (`apps/dashboard/tabs/`)

Each is lazy-loaded by `router.tsx`. `AppTab`/`VersionTab`/`BundleTab`/`DomainTab`/`UserTab`/`RoleTab`/
`PermissionTab` branch on `useParams()` to render create vs. show.

- **`HomeTab`** — welcome hero, totals (Apps/Domains/Users from `all().data.itemsCount`), quick-access
  grid (accessible nav items), quick actions (create app / add domain / invite user).
- **`AppsTab`** — `ModelDataTable` on `App` (ID, Name, Package, Summary, Status badge, Domains), row
  click → app detail, delete via `ConfirmDelete`.
- **`AppTab`** — create form (name/package/summary/description + logo) → `App.create`; show page with
  tabs **Details** (edit form + Screenshots + Versions table + Domains bind via `MultiSelect`) and
  **Statistics** (`AppStats`, admin-only).
- **`VersionTab`** — add (name, api_key, changelog, APK) → `Version.store`; show page with **Details**
  (edit form + Bundles table) and **Statistics** (`VersionStats`).
- **`BundleTab`** — add (required name + ZIP) → `Bundle.store`; show page with edit (name + optional
  replacement ZIP) or a read-only summary when the user lacks `bundle.update`.
- **`DomainsTab` / `DomainTab`** — domain list; create/edit (name, description, image) + Statistics.
- **`UsersTab` / `UserTab`** — LDAP user list (+ invite); detail with **Domains** (bind/unbind via
  `MultiSelect`), **Security** (role checkboxes + permissions grouped by model, role-inherited ones
  disabled with a "via role" badge), and **Statistics**.
- **`RolesTab` / `RoleTab`** — role list; detail with the role's permissions table (main content) plus
  **Users** (attach/detach via `MultiSelect`) and **Statistics**.
- **`PermissionsTab` / `PermissionTab`** — permission list; detail with **Roles** / **Users** tables.
- **`StatisticsTab`** — general overview from `Statistics.general()`.
- **`SettingsTab`** — profile editor (avatar + name) → `User.editProfile`.

Cross-cutting: mutations are gated with `can({ permission })`; the Statistics inner tabs render only for
`can({ roles: ["super-admin","admin"] })`; list deletes use `ConfirmDelete` + a `requestKey` bump.

---

## Auth SPA (`apps/auth/`)

Served by the `auth` Blade view for `/login`, `/register`, and the `auth{any}` catch-all. No router:
`index.tsx` picks the page from `window.location.pathname`.

- **`index.tsx`** (`Login`) — email/password, remember-me, password visibility, LDAP fallback. On success
  `window.location.href = DashboardRouter.getPath("home")`. Mounts `ThemeProvider` + `ToastProvider`.
- **`register.tsx`** — invitee activation. Reads `token` from the query; fields `code`, `name`, `login`,
  `password` + confirmation; posts `/auth/register` with `Authorization: Bearer <token>`.
- **`AuthShell.tsx`** — split-screen layout (branded aside + centered form).
