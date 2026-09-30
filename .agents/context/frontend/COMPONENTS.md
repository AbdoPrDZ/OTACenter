# OTACenter Component Reference

Reference documentation for every React component in `resources/js`. Last updated with the current dashboard shell.

## Contents
- [General conventions](#general-conventions)
- [Global components (`components/`)](#global-components-components)
- [UI primitives (`components/ui/`)](#ui-primitives-componentsui)
- [Dashboard components (`apps/dashboard/components/`)](#dashboard-components-appsdashboardcomponents)
- [Dashboard tabs (`apps/dashboard/tabs/`)](#dashboard-tabs-appsdashboardtabs)

---

## General conventions

- **Primitive library is Base UI (`@base-ui/react/*`), NOT Radix.** The classic shadcn/Radix implementations were replaced with Base UI subpath packages (`button`, `dialog`, `menu`, `combobox`, `tabs`, `tooltip`, `switch`, `progress`, `radio`, `radio-group`, `scroll-area`, `separator`, `input`, `checkbox`, `alert-dialog`, `drawer`, `merge-props`, `use-render`). External libs only in `chart.tsx` (Recharts) and `carousel.tsx` (Embla).
- **Polymorphism via the `render` prop** (Base UI pattern), not `asChild`. Examples: `Button render={<ComboboxTrigger />}`, `Item render={<a href="..." />}`, `SidebarMenuButton render={...}`.
- **Every component sets a `data-slot="..."` attribute** (e.g. `data-slot="button"`); the heavy Tailwind group/data-attribute selectors depend on it.
- **Active states use Base UI data-attributes**: `data-active` (Tabs), `data-checked` (Checkbox/Switch/Radio), `data-highlighted` (Menu items), `data-[state=...]` on Base UI stateful components.
- **Shared helpers**: `cn` from `@/lib/utils`, `cva` from `class-variance-authority`, icons from `lucide-react`.
- Some files carry `"use client"` (alert-dialog, checkbox, dialog, dropdown-menu, progress, scroll-area, sheet, sidebar, tabs, tooltip, chart); others omit it — they are only used by client components anyway.
- **Path alias** `@/` → `resources/js/`.

---

## Global components (`components/`)

Reusable across the whole frontend.

### `RouteLoading`
- **Exported**: `default function RouteLoading()` — no props.
- **Purpose**: Full-area centered spinner. Used as the `React.Suspense` fallback for every lazy-loaded dashboard tab in `apps/dashboard/router.tsx`.
- **Key details**: Renders `<div className="flex flex-1 items-center justify-center p-16"><Spinner className="size-6" /></div>`.
- **Usage**: `<React.Suspense fallback={<RouteLoading />}><AppsTab /></React.Suspense>`.

### `ImagePicker`
- **Exported**: `interface ImagePickerProps`, `default function ImagePicker`.
- **Purpose**: Reusable image picker with live preview (logo/avatar-style single images). An outline `Button` (sized `width`×`height`, `borderRadius`) triggers `pickImage()` from `utils/bootstrap`; the chosen file is shown via `URL.createObjectURL`, otherwise the existing `value` URL is shown.
- **Props**:
  | Prop | Type | Required | Default |
  |------|------|----------|---------|
  | `value` | `string` | no | existing preview URL |
  | `image` | `File` | no | — |
  | `onChange` | `(file?: File) => void` | **yes** | — |
  | `width` | `number` | no | `160` |
  | `height` | `number` | no | `160` |
  | `borderRadius` | `number` | no | `12` |
  | `error` | `string` | no | — |
  | `className` | `string` | no | — |
- **Key details**: Selecting a file calls `onChange(file)`; the parent keeps it in state and must include it in its `FormData`. `image === undefined` while editing shows the existing `value` URL.
- **Usage**: `<ImagePicker value={logoUrl} image={logo} onChange={(f) => setLogo(f)} />`.

### `LazySkeleton`
- **Exported**: `type LazySkeletonType`, `interface LazySkeletonProps`, `default function LazySkeleton`.
- **Purpose**: Conditional placeholder — renders a skeleton of a chosen shape while `loading` is true, otherwise renders `children`.
- **Props**:
  | Prop | Type | Required | Default |
  |------|------|----------|---------|
  | `loading` | `boolean` | **yes** | — |
  | `type` | `"input" \| "image" \| "text" \| "title" \| "card" \| "avatar" \| "table" \| "list"` | no | `"text"` |
  | `width` | `string \| number` | no | per-type default |
  | `height` | `string \| number` | no | per-type default |
  | `borderRadius` | `string \| number` | no | per-type default |
  | `children` | `React.ReactNode` | no | — |
- **Key details**: Numeric sizes → `px`. Built on `ui/Skeleton`. Per-type defaults (e.g. avatar 40×40 r50%, card composite box, table 5×4 with header row). Only current consumer is `Form.tsx` (title).
- **Usage**: `<LazySkeleton loading={loading} type="title">{title}</LazySkeleton>`.

### `DomainTags`
- **Exported**: `default function DomainTags`.
- **Purpose**: Renders a list of `IDomain`s as small rounded "tag" chips (muted background). Renders an
  em-dash placeholder when `domains` is empty/missing.
- **Props**: `{ domains: IDomain[]; className?: string }`.
- **Usage**: `<DomainTags domains={row.domains ?? []} />` — used as a `renderCell` for the Domains
  column in `AppsTab` and `UsersTab`.

### `StatisticsViews`
- **Exported**: `StatCard`, `StatusBreakdown` (shared blocks), and the per-entity panels `UserStats`,
  `RoleStats`, `DomainStats`, `AppStats`, `VersionStats`.
- **Purpose**: The per-entity statistics used to live on separate `/dashboard/statistics/*` routes
  (`StatisticsDetailTab`, now deleted). They are embedded as inner "Statistics" tabs on each model
  page — `DomainStats` in `DomainTab`, `AppStats` in `AppTab`, `VersionStats` in `VersionTab`,
  `UserStats` in `UserTab`, `RoleStats` in `RoleTab`.
- **Props**: each panel takes the entity id, e.g. `<DomainStats domainId={7} />` / `<AppStats appId={7} />`.
- **Key details**: Each panel fetches its `Statistics.byX(id)` on mount (spinner until loaded) and
  renders stat cards + `CardBlock`/`EntityList` lists — no header/back button (the host tab provides
  those). `AppStats` versions list is clickable and navigates to the version's show page
  (`/dashboard/apps/{appId}/versions/{versionId}`).

### `ModelDataTable`
- **Exported**: `type DataTableFeatures`, `interface ModelStatic<MT>`, `interface ModelDataTableProps<MT>`, `default function ModelDataTable<MT extends IModel>`.
- **Purpose**: Server-driven data table for a frontend model. Debounced search (**800ms** — `useDebounce` in the file; exactly **one** fetch fires 800ms after the last keystroke, confirmed by `ModelDataTable.test.tsx`), server-side sort + pagination, column visibility toggles, optional row selection checkboxes, skeleton loading, empty state. Wired to a model class exposing `static all()` and optionally `static getDataTableColumns()`.
- **Props**:
  | Prop | Type | Required | Default |
  |------|------|----------|---------|
  | `model` | `ModelStatic<MT>` | **yes** | — |
  | `url` | `string` | no | model endpoint |
  | `columns` | `DataTableColumn<MT>[]` | no | `model.getDataTableColumns?.()` |
  | `pageSize` | `number` | no | `10` |
  | `pageSizeOptions` | `number[]` | no | `[10, 20, 50, 100]` |
  | `enableSearch` | `boolean` | no | `true` |
  | `enableSorting` | `boolean` | no | `true` |
  | `enableColumnVisibility` | `boolean` | no | `true` |
  | `enableRowSelection` | `boolean` | no | `false` |
  | `searchPlaceholder` | `string` | no | `"Search..."` |
  | `emptyMessage` | `string` | no | `"No results found."` |
  | `empty` | `React.ReactNode` | no | — |
  | `actions` | `(row: MT) => React.ReactNode` | no | — |
  | `onRowClick` | `(row: MT) => void` | no | adds `cursor-pointer` |
  | `requestKey` | `string \| number` | no | re-fetches on change |
  | `className` | `string` | no | — |
- **Key details**: TanStack Table **features API** (`useTable`, `tableFeatures`, `rowSortingFeature`, `rowPaginationFeature`, `columnVisibilityFeature`, `rowSelectionFeature`, `columnFilteringFeature`, `createSortedRowModel`, `createPaginatedRowModel`, `createFilteredRowModel`). Fully manual/server-driven; fetches via `model.all({ url, pagination, sort, filter: { quickFilterValues: [search] } })` expecting `ItemsResponse<MT>` (  `{ items, itemsCount, pagesCount, page }`). Loading renders `Math.min(pageSize, 5)` skeleton rows. Used by **AppsTab**, **DomainsTab** and **UsersTab** (see tabs section). Rows are clickable via `onRowClick` (adds `cursor-pointer`); an `actions` column is appended when the `actions` render-prop is provided (e.g. delete confirms).
- **Usage**: `<ModelDataTable model={App} onRowClick={(row) => navigate(DashboardRouter.getPath("app.show", { id: String(row.id) }))} />`.

### `Form`
- **Exported**: `interface FormMessage`, `default function Form<T extends FieldValues>`.
- **Purpose**: Thin wrapper around a react-hook-form `useForm` instance. Renders `<form>`, optional skeleton-loaded title, optional submit-confirmation dialog, and a root-error alert. Does NOT render field inputs — children register with `formHook`.
- **Props**:
  | Prop | Type | Required | Notes |
  |------|------|----------|-------|
  | `formHook` | `UseFormReturn<T>` | **yes** | react-hook-form instance |
  | `submitHandler` | `(data: T) => Promise<void>` | **yes** | called by `handleSubmit`/confirm |
  | `children` | `ReactNode` | no | field content |
  | `loading` | `boolean` | no | skeleton title |
  | `title` | `string` | no | via `Typography variant="h4"` |
  | `confirm` | `boolean` | no | confirmation `Dialog` before submit |
  | `...props` | `FormHTMLAttributes<HTMLFormElement>` | no | spread on `<form>` |
- **Key details**: `confirming` local state; Confirm → `submitting`, `submitHandler(getValues())`. Root errors render an `Alert` with `onClose={() => clearErrors()}`. **Known pre-existing TS errors** (AGENTS.md). Contains **legacy Bootstrap/MUI markup** (`d-flex`, `variant="contained"`, `color="primary"`) — flagged as partially migrated; do not copy its styling. Only consumer: `apps/auth/index.tsx` (Login). Modern field primitives (`ui/field.tsx`) are NOT wired in yet.
- **Usage**: `<Form title="Login" formHook={formHook} submitHandler={onSubmit}>...</Form>`; caller sets `setError("root", { type, message })` for auth failures.

### `Forbidden`
- **Exported**: `default function Forbidden()`.
- **Purpose**: "Access denied" panel shown by `Layout`'s route guard when the current user lacks the
  permission/role required for the active route. Rendered in place of the tab content.
- **Key details**: `Card` with `ShieldX` icon tile, "Access denied" title, a short description, and a
  "Back to home" `Button` navigating to `DashboardRouter.getPath("home")!`.

### `navigation.ts` (not a component — nav config/helper)
- **Exported**: `interface NavItem`, `const NAV_ITEMS: NavItem[]`, `function isNavActive(item, route)`,
  `const ROUTE_ACCESS: Record<string, RouteAccess>`, `function getRouteAccess(name?)`.
- **Purpose**: Shared navigation configuration consumed by `SideMenu` and `AppNavbar`, plus the
  per-route access map used by `Layout`'s guard. `RouteAccess` comes from `@/utils/permissions`.
- **`NAV_ITEMS`** (7 entries): `home` (Home icon, active `["home"]`), `apps` (PanelsTopLeft, active `["apps","app.add","app.show"]`), `domains` (Globe, active `["domains","domain.add","domain.show"]`), `users` (Users), `roles` (ShieldCheck, active `["roles","role.show"]`), `statistics` (BarChart3, active `["statistics"]`), `settings` (Settings). `activeNames` match route names in `apps/dashboard/router.tsx`. Each item carries an `access?: RouteAccess` used to filter it out of the nav when the user lacks the requirement.
- **`ROUTE_ACCESS`**: maps every route name to its access requirement — `home`/`settings` → `{}` (public); `apps`/`app.show` → `{ permission: "app.view" }`; `app.add` → `{ permission: "app.create" }`; `app.version.add` → `{ permission: "version.create" }`; `app.version.show` → `{ permission: "version.view" }`; `app.version.bundle.add` → `{ permission: "bundle.create" }`; `app.version.bundle.show` → `{ permission: "bundle.view" }`; `domains`/`domain.show` → `{ permission: "domain.view" }`; `domain.add` → `{ permission: "domain.create" }`; `users`/`user.show` → `{ permission: "user.view" }`; `roles`/`role.show` → `{ permission: "role.view" }`; `permissions`/`permission.show` → `{ permission: "permission.view" }`; `statistics` → `{ roles: ["super-admin", "admin"] }`.
- **`isNavActive`**: `!!route.name && item.activeNames.includes(route.name)`.
- **Key details**: `NavItem = { name, label, icon: LucideIcon, activeNames: string[], access?: RouteAccess }`.

---

## UI primitives (`components/ui/`)

### `ui/button.tsx` — Button
- **Exports**: `Button`, `buttonVariants` (cva).
- **Props**: `ButtonPrimitive.Props & VariantProps<typeof buttonVariants>` — `className`; `variant`: `"default" | "outline" | "secondary" | "ghost" | "destructive" | "link"` (default `"default"`); `size`: `"default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"` (default `"default"`); native button attrs via Base UI `@base-ui/react/button`, plus `render` for polymorphism.
- **Details**: `data-slot="button"`. Sizes auto-size Lucide children (`[&_svg:not([class*='size-'])]:size-4`) and support `data-[icon=inline-start/end]` padding. Foundation for `AlertDialog`, `Dialog`, `Combobox`, `InputGroupButton`, `PaginationLink`, `SidebarTrigger`, `CarouselPrevious/Next`.
- **Usage**: `<Button variant="outline" size="sm">...</Button>`; `<Button render={<ComboboxTrigger />} />`.

### `ui/alert.tsx` — Alert
- **Exports**: `Alert`, `AlertTitle`, `AlertDescription`, `AlertAction`.
- **Props**: `Alert` → `ComponentProps<"div"> & VariantProps<alertVariants>`, `variant`: `"default" | "destructive"` (default `"default"`). Others → `ComponentProps<"div">`.
- **Details**: Pure divs, `role="alert"`. `AlertAction` is absolutely positioned top-right; base class reserves padding when an action exists (`has-data-[slot=alert-action]:pr-18`). Icon-as-first-child grid layout. `AlertDescription` auto-underlines links.

### `ui/alert-dialog.tsx` — AlertDialog
- **Exports**: `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogMedia`, `AlertDialogOverlay`, `AlertDialogPortal`, `AlertDialogTitle`, `AlertDialogTrigger`.
- **Props**: Base UI `@base-ui/react/alert-dialog` primitives. `AlertDialogContent` adds `size?: "default" | "sm"` (default `"default"`; `sm` → `max-w-64`, footer becomes grid). `AlertDialogCancel` picks `variant`/`size` of `Button` (defaults `outline`/`default`). `AlertDialogAction` renders `<Button>` default variant. `AlertDialogMedia` is a `size-8` rounded icon tile.
- **Details**: `"use client"`. `AlertDialogContent` auto-wraps Portal + Overlay. Perfect for destructive confirms with icon + title + description + Cancel/Action footer.

### `ui/card.tsx` — Card
- **Exports**: `Card`, `CardHeader`, `CardFooter`, `CardTitle`, `CardAction`, `CardDescription`, `CardContent`.
- **Props**: `Card` → `ComponentProps<"div"> & { size?: "default" | "sm" }` (default `"default"`). Others → `ComponentProps<"div">`.
- **Details**: Native divs. `Card` defines `[--card-spacing:--spacing(4)]` (3 for `sm`) used for all padding. `CardHeader` becomes `1fr auto` grid when a `CardAction` present. Auto-rounds first/last images. `overflow-hidden rounded-lg ring-1 ring-foreground/10`.

### `ui/checkbox.tsx` — Checkbox
- **Exports**: `Checkbox`.
- **Props**: `CheckboxPrimitive.Root.Props` (`@base-ui/react/checkbox`) — `checked`, `defaultChecked`, `onCheckedChange`, `disabled`, `indeterminate`, `render`.
- **Details**: `"use client"`. `size-4` rounded square, `data-checked:bg-primary`, lucide `CheckIcon` indicator. Expanded hit area via `after:-inset-x-3 after:-inset-y-2`. Dismisses inside disabled `Field` (`group-has-disabled/field:opacity-50`). Used by `ModelDataTable` row selection.

### `ui/combobox.tsx` — Combobox
- **Exports**: `Combobox`, `ComboboxInput`, `ComboboxContent`, `ComboboxList`, `ComboboxItem`, `ComboboxGroup`, `ComboboxLabel`, `ComboboxCollection`, `ComboboxEmpty`, `ComboboxSeparator`, `ComboboxChips`, `ComboboxChip`, `ComboboxChipsInput`, `ComboboxTrigger`, `ComboboxClear`, `ComboboxValue`, `useComboboxAnchor`.
- **Props**: `Combobox` is a direct alias of Base UI `Combobox.Root` (`@base-ui/react/combobox`): `value`, `onValueChange`, `items`, `multiple`, etc. `ComboboxInput` adds `showTrigger?: boolean` (default `true`), `showClear?: boolean` (default `false`). `ComboboxContent` picks `side/align/sideOffset/alignOffset/anchor` (defaults bottom/start/6/0). `ComboboxChip` adds `showRemove?: boolean` (default `true`).
- **Details**: Composition pattern: `Combobox > ComboboxInput` + `ComboboxContent > ComboboxList > ComboboxItem` (+ Group/Label/Empty/Separator); multi-select: `Combobox multiple > ComboboxChips > ComboboxChip`. Built on `InputGroup`/`Button`. `useComboboxAnchor()` returns a ref used as the popup `anchor`.

### `ui/center.tsx` — Center
- **Exports**: **default only** `function Center`.
- **Props**: `React.HTMLAttributes<HTMLDivElement>`.
- **Details**: Full-viewport centering: `flex justify-center items-center h-screen flex-col gap-2`. Quirks: no React import (uses `React.HTMLAttributes` type only), no `cn` (className overrides base via spread). Legacy helper — avoid unless matching existing usage.

### `ui/dialog.tsx` — Dialog
- **Exports**: `Dialog`, `DialogTrigger`, `DialogPortal`, `DialogClose`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogOverlay`.
- **Props**: Base UI `@base-ui/react/dialog`. `DialogContent` adds `showCloseButton?: boolean` (default `true`) → ghost X button top-right; auto-wraps Portal + Overlay. `DialogFooter` adds `showCloseButton?: boolean` (default `false`) → outline "Close" button. `DialogTitle`/`Description` styled with `font-heading`.
- **Details**: `"use client"`. Modal, centered `max-w-[calc(100%-2rem)] sm:max-w-sm`, zoom/fade animations. Used by `Form` confirm flow.

### `ui/drawer.tsx` — Drawer
- **Exports**: `Drawer`, `DrawerPortal`, `DrawerOverlay`, `DrawerSwipeHandle`, `DrawerTrigger`, `DrawerClose`, `DrawerContent`, `DrawerHeader`, `DrawerFooter`, `DrawerTitle`, `DrawerDescription`.
- **Props**: Base UI `@base-ui/react/drawer`. `Drawer` adds `showSwipeHandle?: boolean` (default `false`), and passes `swipeDirection` (`"up" | "down" | "left" | "right"`, default `"down"`), `modal` (default `true`), `snapPoints`. `DrawerContent` = `Popup.Props`.
- **Details**: Context-based (`DrawerContent` throws outside `Drawer`). Overlay only when `modal`. x-axis default width `75%` (`sm: 24rem`) via `--drawer-inset`/`--drawer-content-width` CSS vars; y-axis max-height `calc(100dvh-6rem)`. Supports nested drawers. **Used by `AppNavbar`** (mobile nav): `swipeDirection="left"`, width via inline `style={{ "--drawer-content-width": "min(18rem, 85vw)" }}`.

### `ui/dropdown-menu.tsx` — DropdownMenu
- **Exports**: `DropdownMenu`, `DropdownMenuPortal`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuGroup`, `DropdownMenuLabel`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`.
- **Props**: Base UI `@base-ui/react/menu`. `DropdownMenuContent` picks `align/side/sideOffset/alignOffset` (defaults start/bottom/4/0). `DropdownMenuItem` adds `inset?: boolean`, `variant?: "default" | "destructive"` (default `"default"`). `DropdownMenuLabel` adds `inset`. `DropdownMenuSubContent` defaults side `"right"`.
- **Details**: `"use client"`. `DropdownMenuShortcut` = muted `ml-auto` span. Used by `SideMenu` footer, `AppNavbar`, and `UserMenu`.

### `ui/empty.tsx` — Empty
- **Exports**: `Empty`, `EmptyHeader`, `EmptyTitle`, `EmptyDescription`, `EmptyContent`, `EmptyMedia`.
- **Props**: All `ComponentProps<"div">`. `EmptyMedia` adds `variant?: "default" | "icon"` (default `"default"`; `icon` → `size-8` rounded `bg-muted` tile).
- **Details**: Native divs, dashed-border empty state block (`rounded-xl border-dashed p-6`). Used by `ModelDataTable` for "No results found."

### `ui/field.tsx` — Field (form layout)
- **Exports**: `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup`, `FieldLegend`, `FieldSeparator`, `FieldSet`, `FieldContent`, `FieldTitle`.
- **Props**: `Field` → `ComponentProps<"div"> & VariantProps<fieldVariants>`, `orientation: "vertical" | "horizontal" | "responsive"` (default `"vertical"`; `responsive` uses container queries via `FieldGroup` `@container/field-group`). `FieldLegend` adds `variant: "legend" | "label"` (default `"legend"`). `FieldError` adds `errors?: Array<{ message?: string } | undefined>` — dedupes; 1 error → plain, many → `<ul>`; `children` wins; `null` when empty. `FieldSeparator` renders `ui/Separator` with optional centered text.
- **Details**: Label disabled-dim via `group-data-[disabled=true]/field`. `FieldTitle` reuses `data-slot="field-label"`. **The modern form API — NOT yet wired into `Form.tsx`.**

### `ui/input.tsx` — Input
- **Exports**: `Input`.
- **Props**: `React.ComponentProps<"input">` (typed native, renders Base UI `@base-ui/react/input` `InputPrimitive`).
- **Details**: `h-7 rounded-md border-input bg-input/20`, focus ring, `aria-invalid` destructive styling, file-input styles. Base for `InputGroupInput` (which strips borders).

### `ui/input-group.tsx` — InputGroup
- **Exports**: `InputGroup`, `InputGroupAddon`, `InputGroupButton`, `InputGroupText`, `InputGroupInput`, `InputGroupTextarea`.
- **Props**: `InputGroupAddon` → `align: "inline-start" | "inline-end" | "block-start" | "block-end"` (default `"inline-start"`); clicking it (non-button) focuses the group's first input. `InputGroupButton` → `type` default `"button"`, `variant` default `"ghost"`, `size`: `"xs" | "sm" | "icon-xs" | "icon-sm"` (default `"xs"`). `InputGroupInput`/`InputGroupTextarea` are borderless controls (`data-slot="input-group-control"`).
- **Details**: Bordered composite container (`role="group"`). Combobox integration (`in-data-[slot=combobox-content]:focus-within`). What `ComboboxInput` builds internally.

### `ui/item.tsx` — Item (list row)
- **Exports**: `Item`, `ItemMedia`, `ItemContent`, `ItemActions`, `ItemGroup`, `ItemSeparator`, `ItemTitle`, `ItemDescription`, `ItemHeader`, `ItemFooter`.
- **Props**: `Item` → `useRender.ComponentProps<"div"> & VariantProps<itemVariants>`, `variant: "default" | "outline" | "muted"` (default `"default"`), `size: "default" | "sm" | "xs"` (default `"default"`); **polymorphic** via Base UI `useRender`/`mergeProps` (`render` prop). `ItemMedia` → `variant: "default" | "icon" | "image"` (default `"default"`; `image` = `size-8` rounded overflow-hidden `<img object-cover>`). `ItemGroup` → `role="list"`.
- **Details**: `ItemTitle` `line-clamp-1`, `ItemDescription` `line-clamp-2` muted with link styling. Great for user/app/domain lists.

### `ui/label.tsx` — Label
- **Exports**: `Label`.
- **Props**: `React.ComponentProps<"label">`.
- **Details**: Native `<label>`, `text-xs`, `flex items-center gap-2`. Dims when disabled group or `peer-disabled`. Base for `FieldLabel`.

### `ui/pagination.tsx` — Pagination
- **Exports**: `Pagination`, `PaginationContent`, `PaginationEllipsis`, `PaginationItem`, `PaginationLink`, `PaginationNext`, `PaginationPrevious`.
- **Props**: `Pagination` → `ComponentProps<"nav">`. `PaginationLink` → `{ isActive?: boolean } & Pick<Button props, "size"> & ComponentProps<"a">` (`size` default `"icon"`); renders a `Button` whose `render` swaps to `<a>`. `PaginationPrevious`/`PaginationNext` add `text?: string` (defaults `"Previous"`/`"Next"`), icon + hidden-on-sm span.
- **Details**: Chevron icons use `data-icon="inline-start/end"` for Button padding. `PaginationEllipsis` = `MoreHorizontalIcon` + sr-only label.

### `ui/progress.tsx` — Progress
- **Exports**: `Progress`, `ProgressTrack`, `ProgressIndicator`, `ProgressLabel`, `ProgressValue`.
- **Props**: Base UI `@base-ui/react/progress`. `Progress` = `Root.Props` (`value`). Renders `children` then auto `ProgressTrack > ProgressIndicator`.
- **Details**: `"use client"`. Root `flex flex-wrap gap-3` so `ProgressLabel`/`ProgressValue` sit beside the track. `ProgressValue` = muted `tabular-nums` ml-auto.

### `ui/radio-group.tsx` — RadioGroup
- **Exports**: `RadioGroup`, `RadioGroupItem`.
- **Props**: Base UI `@base-ui/react/radio-group` / `@base-ui/react/radio`. `RadioGroup` = `RadioGroupPrimitive.Props` (`value`, `defaultValue`, `onValueChange`, `name`); `RadioGroupItem` = `RadioPrimitive.Root.Props` (`value`).
- **Details**: `grid w-full gap-3`. Items: `aspect-square size-4 rounded-full`, `data-checked:bg-primary`, dot indicator, expanded hit area.

### `ui/scroll-area.tsx` — ScrollArea
- **Exports**: `ScrollArea`, `ScrollBar`.
- **Props**: Base UI `@base-ui/react/scroll-area`. `ScrollArea` = `Root.Props`; `ScrollBar` = `Scrollbar.Props` (default `orientation="vertical"`).
- **Details**: `"use client"`. `ScrollArea` auto-renders `Viewport > {children} + ScrollBar + Corner`. Note: known pre-existing TS error in this file (AGENTS.md).

### `ui/separator.tsx` — Separator
- **Exports**: `Separator`.
- **Props**: Base UI `@base-ui/react/separator`, `orientation?: "horizontal" | "vertical"` (default `"horizontal"`).
- **Details**: `h-px`/`w-px` via `data-horizontal`/`data-vertical`. Used in `Header` (vertical), `FieldSeparator`, `ItemSeparator`.

### `ui/sheet.tsx` — Sheet
- **Exports**: `Sheet`, `SheetTrigger`, `SheetClose`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`. (`SheetPortal`/`SheetOverlay` defined but NOT exported.)
- **Props**: Base UI `@base-ui/react/dialog` (Sheet is a Dialog). `SheetContent` adds `side?: "top" | "right" | "bottom" | "left"` (default `"right"`), `showCloseButton?: boolean` (default `true`).
- **Details**: `"use client"`. `data-starting-style`/`data-ending-style` animations. This is the panel `Sidebar` uses for its mobile drawer.

### `ui/sidebar.tsx` — Sidebar
- **Exports** (24): `Sidebar`, `SidebarContent`, `SidebarFooter`, `SidebarGroup`, `SidebarGroupAction`, `SidebarGroupContent`, `SidebarGroupLabel`, `SidebarHeader`, `SidebarInput`, `SidebarInset`, `SidebarMenu`, `SidebarMenuAction`, `SidebarMenuBadge`, `SidebarMenuButton`, `SidebarMenuItem`, `SidebarMenuSkeleton`, `SidebarMenuSub`, `SidebarMenuSubButton`, `SidebarMenuSubItem`, `SidebarProvider`, `SidebarRail`, `SidebarSeparator`, `SidebarTrigger`, `useSidebar`.
- **Props**:
  - `SidebarProvider`: `ComponentProps<"div"> & { defaultOpen?: boolean; open?: boolean; onOpenChange?: (o: boolean) => void }` (default `defaultOpen=true`). Persists to cookie `sidebar_state` (7 days); `Ctrl/Cmd+B` shortcut toggles; sets `--sidebar-width:16rem`, `--sidebar-width-icon:3rem`.
  - `Sidebar`: `ComponentProps<"div"> & { side?: "left"|"right"; variant?: "sidebar"|"floating"|"inset"; collapsible?: "offcanvas"|"icon"|"none"; dir?: string }` (defaults left/sidebar/offcanvas). Renders: static div when `collapsible="none"`; `Sheet` drawer when mobile (`useIsMobile()`); desktop group with gap + fixed container.
  - `SidebarMenuButton`: `useRender.ComponentProps<"button"> & { isActive?: boolean; tooltip?: string | TooltipContent props } & VariantProps<sidebarMenuButtonVariants>` — `variant: "default"|"outline"`, `size: "default"(h-8)|"sm"(h-7)|"lg"(h-12)`; polymorphic; wraps in `Tooltip` when collapsed + `tooltip` given.
  - `SidebarTrigger`: Button props (hard-set `ghost`/`icon-sm`), toggles via `toggleSidebar`.
  - `useSidebar()` → `{ state, open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar }`; throws outside `SidebarProvider`.
- **Details**: `"use client"`. Depends on `use-mobile`, `Sheet`, `Tooltip`, `Button`, `Input`, `Separator`, `Skeleton`, Base UI `useRender`/`mergeProps`. The desktop backbone of the dashboard shell.

### `ui/skeleton.tsx` — Skeleton
- **Exports**: `Skeleton`.
- **Props**: `React.ComponentProps<"div">`.
- **Details**: `animate-pulse rounded-md bg-muted` div. Used by `LazySkeleton`, `SidebarMenuSkeleton`, `ModelDataTable` loading rows.

### `ui/spinner.tsx` — Spinner
- **Exports**: `Spinner`.
- **Props**: `React.ComponentProps<"svg">`.
- **Details**: Lucide `Loader2Icon`, `role="status"` `aria-label="Loading"`, `size-4 animate-spin`. Used by `RouteLoading`.

### `ui/switch.tsx` — Switch
- **Exports**: `Switch`.
- **Props**: Base UI `@base-ui/react/switch` `Root.Props` & `{ size?: "sm" | "default" }` (default `"default"`).
- **Details**: `data-checked:bg-primary`, thumb translate on check; `default` 28×16.6px with `size-3.5` thumb, `sm` 24×14px with `size-3`. Great for settings toggles.

### `ui/table.tsx` — Table
- **Exports**: `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption`.
- **Props**: All native element props (`ComponentProps<"table">` etc.).
- **Details**: No library. `Table` wraps in an `overflow-x-auto` container. Dense (`text-xs`), hover rows, checkbox-cell padding (`[&:has([role=checkbox])]:pr-0`), selected-row support. Backbone of `ModelDataTable`.

### `ui/tabs.tsx` — Tabs
- **Exports**: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `tabsListVariants`.
- **Props**: Base UI `@base-ui/react/tabs`. `Tabs` → `Root.Props` (`value`, `defaultValue`, `onValueChange`, `orientation`, `loop`) with `orientation` default `"horizontal"`. `TabsList` → `List.Props & VariantProps<tabsListVariants>`, `variant: "default" | "line"` (default `"default"`; `line` = underline indicator). `TabsTrigger` = `Tab.Props` (`value`); `TabsContent` = `Panel.Props` (`value`).
- **Details**: `"use client"`. Active state is `data-active` (Base UI naming: trigger = `Tab`, content = `Panel`). `tabsListVariants` exported for reuse.

### `ui/textarea.tsx` — Textarea
- **Exports**: `Textarea`.
- **Props**: `React.ComponentProps<"textarea">`.
- **Details**: Native textarea. `field-sizing-content` auto-grows, `resize-none`, `min-h-16`, `aria-invalid` destructive styling. Base for `InputGroupTextarea`.

### `ui/tooltip.tsx` — Tooltip
- **Exports**: `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`.
- **Props**: Base UI `@base-ui/react/tooltip`. `TooltipProvider` → `Provider.Props` (`delay` default `0`). `TooltipContent` → `Popup.Props & Pick<Positioner.Props, "side"|"align"|"sideOffset"|"alignOffset">` (defaults top/center/4/0) — renders Portal > Positioner > Popup with arrow.
- **Details**: `data-[state=delayed-open]`/`data-open` animations. Used by `SidebarMenuButton` (collapsed icon tooltips).

### `ui/typography.tsx` — Typography
- **Exports**: **default only** `function Typography`.
- **Props**: `React.HTMLAttributes<HTMLParagraphElement> & { variant?: "h1"|"h2"|"h3"|"h4"|"h5"|"h6"|"body1"|"body2"; color?: "inherit"|"primary"|"secondary"|"success"|"error"|"warning"|"info" }` (defaults body1/inherit).
- **Details**: Always renders `<p>` (no tag switching), computes `text-${variant} text-${color}`. Relies on non-standard Tailwind classes (`text-h1`, `text-primary`) — **legacy/incomplete helper**, avoid for new code; does not merge `className`. Used by `Form` title.

### `ui/visibility.tsx` — Visibility
- **Exports**: **default only** `function Visibility`.
- **Props**: `{ children: React.ReactNode; visible: boolean }` — both required.
- **Details**: `visible ? children : null` (unmounts, no CSS hide). Used by `Form` for confirm dialog + error alert.

### `ui/chart.tsx` — Chart
- **Exports**: `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`, `ChartStyle`, `type ChartConfig`.
- **Props**: `ChartContainer` → `ComponentProps<"div"> & { config: ChartConfig; children: ResponsiveContainer children; initialDimension?: { width; height } }` (default `{320,200}`). `ChartTooltipContent` adds `hideLabel?`, `hideIndicator?`, `indicator?: "line"|"dot"|"dashed"` (default `"dot"`), `nameKey?`, `labelKey?`. `ChartLegendContent` adds `hideIcon?`, `nameKey?`.
- **Details**: `"use client"`. Recharts wrapper. `ChartConfig` = `Record<string, { label?; icon?; color? } | { label?; icon?; theme: { light; dark } }>`. `ChartStyle` injects `--color-<key>` CSS vars under `[data-chart=id]`; series use `stroke="var(--color-<key>)"`. `ChartTooltip`/`ChartLegend` are Recharts aliases used with `content={<ChartTooltipContent />}`.

### `ui/carousel.tsx` — Carousel
- **Exports**: `type CarouselApi`, `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext`, `useCarousel`.
- **Props**: `Carousel` → `ComponentProps<"div"> & { opts?: CarouselOptions; plugins?: CarouselPlugin; orientation?: "horizontal"|"vertical"; setApi?: (api: CarouselApi) => void }` (default horizontal). `CarouselItem`/`CarouselContent`/`CarouselPrevious`/`CarouselNext` → `ComponentProps<"div">` / Button props (`Previous`/`Next` default `outline`/`icon-sm`).
- **Details**: Embla (`embla-carousel-react`). Keyboard arrows, `canScrollPrev/Next` gating, 1rem gutter. Likely for app screenshot galleries on the App detail page.

---

## Dashboard components (`apps/dashboard/components/`)

The shell of the dashboard SPA. Route state flows in via `props.route` (from `DashboardRouter.current`).

### `Layout.tsx` — Layout (shell root)
- **Exports**: `default function Layout({ children })`.
- **Props**: `{ children?: ReactNode }`.
- **Purpose**: Root shell wiring the desktop sidebar, mobile top bar, desktop header, and the scrollable content region.
- **Key details**:
  - `const [route, setRoute] = useState(DashboardRouter.current)`; `useEffect(() => DashboardRouter.listen((_from, to) => setRoute(to)), [])`.
  - `const isMobile = useIsMobile()`.
  - Structure: `<SidebarProvider>` → `{!isMobile && <SideMenu route={route} />}` → `<SidebarInset>` → `<AppNavbar route={route} />` + `<Header route={route} />` + `<div className="flex-1 overflow-auto p-4 md:p-6">{children}<Outlet /></div>`.
  - Mobile hides `SideMenu` (suppressing the sidebar's auto-Sheet); `AppNavbar` (root `md:hidden`) and `Header` (`hidden md:flex`) are mutually exclusive by breakpoint.
  - **Route guard**: `const allowed = can(getRouteAccess(route.name))` (`can`/`RouteAccess` from `@/utils/permissions`). When `allowed` is false, `<Forbidden />` renders in place of `{children}<Outlet />`, so direct URL access to an unauthorized route shows "Access denied" instead of the tab.
  - Rendered as parent route element in `apps/dashboard/router.tsx`; tabs render into `<Outlet />`.

### `SideMenu.tsx` — SideMenu (desktop sidebar)
- **Exports**: `default function SideMenu({ route })`.
- **Props**: `{ route: Route }`.
- **Purpose**: Desktop collapsible sidebar: brand, General + Settings nav groups, footer user dropdown, rail.
- **Key details**:
  - `<Sidebar collapsible="icon">`. Brand button (RadioTower logo + "OTACenter"/"App center") navigates home; text hidden when collapsed (`group-data-[collapsible=icon]:hidden`).
  - General group = `NAV_ITEMS.filter(i => i.name !== "settings")`; Settings group = the rest. Each item: `SidebarMenuButton tooltip={label} isActive={isNavActive(item, route)} onClick={() => navigate(DashboardRouter.getPath(item.name)!)}`.
  - **Permission filtering**: both groups are pre-filtered with `NAV_ITEMS.filter(i => can(i.access))` — items the user has no access to are not rendered (e.g. `statistics` only for `super-admin`/`admin`).
  - Footer (only when `User.current` exists): `DropdownMenuTrigger render={<SidebarMenuButton size="lg" ... />}` → avatar or initials (from `user.image_url` / first-2-uppercase), name + login, ChevronDown; menu with label, `DropdownMenuItem variant="destructive"` Logout → `User.logout()`.
  - `SidebarRail` at the end. Local `BrandLogo` sub-component.

### `AppNavbar.tsx` — AppNavbar (mobile top bar + drawer)
- **Exports**: `default function AppNavbar({ route })`. (Local `DrawerNav` sub-component.)
- **Props**: `{ route: Route }`.
- **Purpose**: Mobile-only top bar (`md:hidden`) with a left-swipe navigation drawer, route title, and user dropdown.
- **Key details**:
  - Root: `flex h-14 items-center gap-2 border-b bg-background px-3 md:hidden`.
  - `<Drawer open={open} onOpenChange={setOpen} swipeDirection="left">`; trigger = `Button variant="ghost" size="icon"` (Menu icon). Content width via inline style `{ "--drawer-content-width": "min(18rem, 85vw)" } as React.CSSProperties` — **do not** use a `w-*` class (conflicts with drawer base class).
  - Drawer header: brand tile + `DrawerTitle`/`DrawerDescription` + close `DrawerTrigger` (X icon).
  - `DrawerNav` renders every `NAV_ITEMS` entry as a button (active = `bg-accent`, inactive = muted hover); on click navigates `DashboardRouter.getPath(item.name)` and calls `onNavigate` (closes drawer). Entries are pre-filtered with `can(item.access)` (same as `SideMenu`).
  - Title in bar: `props.route.title`. Right: user dropdown (Settings → `getPath("settings")`, Logout → `User.logout()`), avatar/initials as in SideMenu.

### `Header.tsx` — Header (desktop toolbar)
- **Exports**: `default function Header({ route })`.
- **Props**: `{ route: Route }`.
- **Purpose**: Desktop-only (`hidden md:flex`) toolbar: sidebar toggle, separator, route title, user menu.
- **Key details**: `h-14 items-center gap-2 border-b px-4`; `<SidebarTrigger />` + `<Separator orientation="vertical" />` + `<h1 className="text-xs/relaxed font-semibold tracking-tight">{props.route.title}</h1>` + `ml-auto <UserMenu />`.

### `UserMenu.tsx` — UserMenu (avatar dropdown)
- **Exports**: `default function UserMenu({ className })`.
- **Props**: `{ className?: string }`.
- **Purpose**: Avatar/initials dropdown with Settings and Logout; shared by desktop header.
- **Key details**: Returns `null` when `!User.current`. Avatar = `user.image_url` img or initials (first letters of name parts, up to 2, uppercased). `DropdownMenuContent align="end" className="w-56"` with label (name + login), Settings (`navigate(DashboardRouter.getPath("settings")!)`), separator, destructive Logout (`User.logout()`).

---

## Dashboard tabs (`apps/dashboard/tabs/`)

The dashboard page content. Each tab is a lazy-loaded route element in `apps/dashboard/router.tsx`
(wrapped in `<React.Suspense fallback={<RouteLoading />}>`). Routes: `home`, `apps`, `app.add`,
`app.show`, `app.version.add`, `app.version.show`, `app.version.bundle.add`, `app.version.bundle.show`,
`domains`, `domain.add`, `domain.show`, `users`, `user.show`, `roles`, `role.show`, `permissions`,
`permission.show`, `statistics`, `settings`.
`HomeTab`, `AppsTab`, `DomainsTab`, `UsersTab`, `RolesTab`, `PermissionsTab`, `StatisticsTab`,
`StatisticsDetailTab` and `SettingsTab` are default-exported; `AppTab`, `DomainTab`, `VersionTab`,
`BundleTab`, `UserTab`, `RoleTab` and `PermissionTab` branch on `useParams()` to render create vs.
show/edit.

Conventions used across tabs:
- **Permission-gated actions**: mutating buttons are wrapped in `can({ permission: "..." })` from
  `@/utils/permissions` (see `frontend/UTILS-API.md` → permissions util). Pattern: create buttons
  (`app.create`, `domain.create`, `version.create`, `bundle.create`, `user.invite`), delete confirms
  (`app.delete`, `domain.delete`, `version.delete`, `bundle.delete`, `screenshot.delete`), edit forms
  (`app.update`, `domain.update`, `version.update`, `bundle.update`), domain bind/unbind
  (`domain.assign_app`/`unassign_app`, `domain.assign_user`/`unassign_user`), role attach/detach
  (`role.attach`/`role.detach`), and bundle activation (`bundle.publish`). `ModelDataTable`'s `actions`
  render-prop becomes `undefined` when the action is not permitted (omitting the actions column entirely).
- **Permission-gated views**: inner tabs are hidden when the user lacks access — "Statistics" tabs on
  every model page render only for `can({ roles: ["super-admin", "admin"] })`; `UserTab`'s "Security"
  tab only when `role.view` AND `permission.view` are held; `PermissionTab`'s "Roles"/"Users" tabs are
  gated by `role.view`/`user.view`. Route-level access (nav + direct URL) is handled centrally by
  `ROUTE_ACCESS` in `navigation.ts` + `Layout`'s guard.
- **Forms use `react-hook-form`** (`useForm`) directly — NOT the legacy `Form.tsx` wrapper. `register`/
  `handleSubmit` + `setError("root"|"field", ...)`; validation messages from the API are mapped with
  `setError`, the global error is stored in `setError("root", ...)` and shown via `<Alert variant="destructive">`.
- **File uploads** build a `FormData`, append `_method: "POST"|"PUT"`, and call the model's
  `create`/`update`/nested `store` with `multiPart: true`. File picking via `pickImage()` / `selectFile()` from `utils/bootstrap`.
- **Nested resources** fetch via model statics (`Version.allForApp`, `Bundle.allForVersion`,
  `AppScreenshot.allForApp`, `Domain.indexByApp/indexByUser`) and use a local `reload` counter to re-fetch.
- **Destructive confirms** use `AlertDialog`; list-level delete reloads a `requestKey` state passed to `ModelDataTable`.
- **Image URLs**: `logo_url`/`image_url` come from the backend `File` model's `url` accessor
  (absolute URL); `AppScreenshot.getUrl(name)` builds `${location.origin}/files/{name}`.

### `HomeTab.tsx` — Home (overview)
- **Exports**: `default function HomeTab()`.
- **Purpose**: Dashboard landing page. Three stat cards (Apps / Domains / Users) counting
  `App.all()`, `Domain.all()`, `User.all()` and reading `response.data.itemsCount`; skeleton cards while loading.
- **Key details**: Uses `Card` + `Skeleton`; icon tile with `bg-primary/10 text-primary`.

### `AppsTab.tsx` — Apps (list)
- **Exports**: `default function AppsTab()`.
- **Purpose**: Server-driven app table via `ModelDataTable` bound to `App`. Header row with title +
  "Add App" button (`navigate("/dashboard/apps/add")`). Row click → `/dashboard/apps/{id}`.
- **Key details**: `actions` column = `AlertDialog` delete confirm; on success bumps a local
  `requestKey` state to re-fetch the table. Passes custom `columns` (ID, Name, Package Name,
  Description, Status, Domains) — Status renders an uppercase muted badge, Domains renders `DomainTags`
  from the eager-loaded `row.domains` (backend `AppController::index` uses `load: ['domains']`).
- **Gating**: "Add App" only when `can({ permission: "app.create" })`; the delete action column is
  `undefined` (omitted) unless `can({ permission: "app.delete" })`.

### `AppTab.tsx` — Add App / App Details
- **Exports**: `default function AppTab()`; internal sections `AppCreate`, `AppShow`, `AppEditForm`,
  `ScreenshotsSection`, `VersionsSection`, `DomainsSection`.
- **Purpose**: Create-app form (`/dashboard/apps/add`) OR the app detail page (`/dashboard/apps/:id`).
- **Key details**:
  - `AppCreate`: fields `name`, `package_name`, `summary`, `description` + optional `logo` via
    `ImagePicker` → `App.create(formData)`; success navigates to the new app's show page.
  - `AppShow`: loads `App.find(appId)` (404 → redirect to apps list); header with logo + name +
    Back button. Content is wrapped in `Tabs` — **Details** (edit form +
    screenshots + versions + domains sections) and **Statistics** (`<AppStats appId={appId} />`).
    Statistics tab renders only for `can({ roles: ["super-admin", "admin"] })`.
  - `AppEditForm`: same fields, `App.update(app.id, formData)`,
    `onSaved` bumps the reload counter; logo via `ImagePicker` (preview shows the existing `logo_url`
    until replaced).
  - `ScreenshotsSection`: grid of `AppScreenshot.allForApp` images (`AppScreenshot.getUrl(name)`),
    hover trash to `AppScreenshot.destroy`, "Upload screenshot" button → `AppScreenshot.store`.
    Upload gated by `screenshot.create`, trash gated by `screenshot.delete`.
  - `VersionsSection`: a `ModelDataTable` bound to `Version` at `Version.endpointFor(appId)`
    (`enableSearch={false}`), with an "Add Version" button → `/dashboard/apps/{id}/versions/add`
    (gated by `version.create`). Row click → `/dashboard/apps/{id}/versions/{versionId}` (the
    VersionTab). The version add/edit form and bundle management **moved out** into
    `VersionTab.tsx` / `BundleTab.tsx`.
  - `DomainsSection`: `Domain.indexByApp` bound list (unbind → `Domain.unbindApp`) + **multi-select
    `Combobox`** (chips + searchable list) of `Domain.all()` minus bound ones; bind → `Domain.bindApp`
    for each selected id. Unbind gated by `domain.unassign_app`, bind list by `domain.assign_app`.
- **Gating**: `AppEditForm` renders only for `can({ permission: "app.update" })`.

### `VersionTab.tsx` — Add Version / Version Details (nested under app)
- **Exports**: `default function VersionTab()`; internal `VersionCreate`, `VersionShow`,
  `VersionEditForm`, `BundlesSection`.
- **Purpose**: Create-version form (`/dashboard/apps/:id/versions/add`) OR the version detail page
  (`/dashboard/apps/:id/versions/:versionId`). `useParams().versionId === "add"` → create, else show.
- **Key details**:
  - `VersionCreate`: fields `name`, **`api_key`** (new required text input), changelog (`Textarea`) +
    **APK file** via a read-only `Input` + "Choose APK" button
    (`selectFile(".apk, application/vnd.android.package-archive")`, same pattern as the bundle form) →
    `Version.store(appId, formData)` (FormData appends `name`, `changelog`, `api_key`, `file`); success
    navigates to the new version's show page. `name`/`api_key` are validated client-side with
    `required` rules + `FieldError` messages.
  - `VersionShow`: loads `Version.show(appId, versionId)` (404 → back to the app); header with name +
    `status` badge, "Published" badge when `latest_id` set, delete confirm →
    `Version.destroy` (then back to the app, gated by `version.delete`), Back button. Content is
    wrapped in `Tabs` — **Details** (edit form + bundles section) and **Statistics**
    (`<VersionStats versionId={...} />`, only for `can({ roles: ["super-admin", "admin"] })`).
  - `VersionEditForm`: `name` + `api_key` + `changelog` prefilled, optional replacement APK file (same
    chooser; "Leave empty to keep the current file") → `Version.updateForApp(appId, version.id, formData)`;
    "Save changes". Renders only for `can({ permission: "version.update" })`.
  - `BundlesSection`: `ModelDataTable` bound to `Bundle` at
    `Bundle.endpointFor(appId, versionId)` with custom columns (ID, Name, URL link via
    `renderCell`, "Active" status badge from `version.latest_id`), "Add Bundle" button →
    `/dashboard/apps/{id}/versions/{versionId}/bundles/add` (gated by `bundle.create`), row click →
    the BundleTab. `actions` column = "Activate" button (`Bundle.activate`) for non-active bundles
    (gated by `bundle.publish`); activate bumps the version `reload` so the Active badge and the
    version's `latest_id` refresh.

### `BundleTab.tsx` — Add Bundle / Bundle Details (nested under app/version)
- **Exports**: `default function BundleTab()`; internal `BundleCreate`, `BundleShow`, `BundleEditForm`.
- **Purpose**: Create-bundle form (`/dashboard/apps/:id/versions/:versionId/bundles/add`) OR the
  bundle detail page (`.../bundles/:bundleId`). `useParams().bundleId === "add"` → create, else show.
- **Key details**:
  - `BundleCreate`: **required `name`** (the bundle version string — placeholder "Bundle version name",
    validated with a `required` rule + `FieldError`) + required ZIP file (`selectFile(".zip,
    application/zip")` with a read-only "No file chosen" `Input` + "Choose ZIP" button) →
    `Bundle.store(appId, versionId, formData)` (FormData appends `name`, `file`); success navigates to
    the new bundle's show page.
  - `BundleShow`: loads `Bundle.show(...)` (404 → back to the version); header with
    name/`file_id` + optional `url` link, delete confirm → `Bundle.destroy` (then back to the
    version, gated by `bundle.delete`), Back button.
  - `BundleEditForm`: `name` prefilled (required), optional replacement ZIP file →
    `Bundle.updateForVersion(appId, versionId, bundle.id, formData)`; "Save changes" (leave file
    empty to keep the current installer). Renders only for `can({ permission: "bundle.update" })`.

### `DomainsTab.tsx` — Domains (list)
- **Exports**: `default function DomainsTab()`.
- **Purpose**: Mirror of `AppsTab` for domains: `ModelDataTable` bound to `Domain`, "Add Domain"
  button → `/dashboard/domains/add` (gated by `domain.create`), row click →
  `/dashboard/domains/{id}`, delete confirm via `AlertDialog` (gated by `domain.delete`).

### `DomainTab.tsx` — Add Domain / Domain Details
- **Exports**: `default function DomainTab()`; internal `DomainCreate`, `DomainShow`, `DomainEditForm`.
- **Purpose**: Create form (`/dashboard/domains/add`) OR detail page (`/dashboard/domains/:id`).
- **Key details**: Fields `name`, `description` + optional `image` via `ImagePicker` (uses the
  backend's `image` upload field, not `logo`). `DomainShow` shows image + name header, Back button,
  and a delete confirm (`Domain.delete`, gated by `domain.delete`) that navigates back to
  `/dashboard/domains`. Content is wrapped in `Tabs` — **Details** (edit form, gated by
  `domain.update`) and **Statistics** (`<DomainStats domainId={id} />`, only for
  `can({ roles: ["super-admin", "admin"] })`).

### `UsersTab.tsx` — Users (list)
- **Exports**: `default function UsersTab()`; internal `InviteDialog`.
- **Purpose**: LDAP user table via `ModelDataTable` bound to `User`. Users are read-only (LDAP);
  management is scoped to domain bindings.
- **Key details**: Passes custom `columns` (ID, Name, Login, Domains) whose Domains column renders
  `DomainTags` from the eager-loaded `row.domains` (backend `UserController::index` uses
  `load: ['domains']`). Row click navigates to `/dashboard/users/{id}` (the `UserTab`). The former
  per-row `UserDomainsDialog` was removed; domain binding moved to the full-page `UserTab`.
- **`InviteDialog`** (super-admin/admin invite flow): header "Invite User" button → `Dialog` with a form
  (`name`, `email`, `role` single-select `Combobox` of `Role.all()`, optional `domain` single-select
  `Combobox` of `Domain.all()` with `showClear`). Submits `User.invite(...)` (`POST /user/invite`). On
  success the dialog swaps to a result view showing the returned registration `link` (read-only `Input`
  + copy button); the registration code is **not shown** — it is emailed to the user separately (mail not
  wired yet). "Invite another" resets the form, and success bumps the parent table's `requestKey`.
- **Gating**: the "Invite User" button only renders when `can({ permission: "user.invite" })`.

### `UserTab.tsx` — User Details (domain binding + security)
- **Exports**: `default function UserTab()`; internal `UserShow`, `SecuritySection`.
- **Purpose**: User detail page (`/dashboard/users/:id`) for **bind/unbind domains** and editing
  **roles & permissions**. This replaces the old `UsersTab.UserDomainsDialog` with a full page.
- **Key details**:
  - Dispatcher: `Number(id)` → `UserShow`, else `ErrorAndRedirect` to `/dashboard/users`.
  - `UserShow`: loads `User.find(userId)` (404 → redirect to `/dashboard/users`); header with avatar
    (`user.image_url`), name, login + Back button. `Domain.indexByUser(userId)` fills the bound list;
    `Domain.all()` fills the available pool. Content is wrapped in `Tabs` — **Domains** (the bind/unbind
    card), **Security** (`<SecuritySection userId={userId} />`) and **Statistics**
    (`<UserStats userId={userId} />`). The Security tab renders only when `role.view` AND
    `permission.view` are held; the Statistics tab only for `can({ roles: ["super-admin", "admin"] })`.
  - Bound list: rows with name + optional description and an `Unbind` button (`Domain.unbindUser`,
    gated by `domain.unassign_user`), empty-state message when none. Multi-select `Combobox` (chips +
    searchable list) of `all` minus bound ones; `Bind` runs
    `Promise.all(selectedIds.map(id => Domain.bindUser(userId, id)))`, then `refresh()` re-runs
    `indexByUser`. The bind list renders only for `can({ permission: "domain.assign_user" })`.
  - **`SecuritySection`** — two cards:
    - **Roles**: grid of all roles (`Role.all()`) with a `Checkbox` per role; checked = user's roles
      (`User.indexRoles`). Toggling calls `Role.attachUser(roleId, userId)` /
      `Role.detachUser(roleId, userId)`, then re-fetches (optimistic local update while in flight).
    - **Permissions**: all permissions (`Permission.all()`) **grouped by model** — group key is the
      permission-name prefix before the first `.` (`user.*`, `role.*`, `permission.*`, `domain.*`,
      `app.*`, `version.*`, `bundle.*`, `screenshot.*`), each group rendered as a bordered section with a
      checkbox per permission. `User.indexPermissions` returns the user's **effective** permissions
      (direct + via role), each item annotated with a `direct` flag. Checked = effective permission; direct
      grants are toggleable (`User.attachPermission`/`detachPermission`), role-inherited ones render as
      **checked + disabled** with a muted "via role" badge. Requires `role.view` + `permission.view`/
      `assign`/`unassign` (super-admin/admin).

### `RolesTab.tsx` — Roles (list)
- **Exports**: `default function RolesTab()`.
- **Purpose**: Server-driven role table via `ModelDataTable` bound to `Role` (Spatie roles). Read-only
  list — no create/update/delete (roles are seeded by `SecuritySeeder`).
- **Key details**: Passes custom `columns` (ID, Name, Guard). Row click navigates to
  `/dashboard/roles/{id}` (the `RoleTab`). Backend-gated: routes carry `permission:role.view`, so only
  `super-admin`/`admin` can list them.

### `RoleTab.tsx` — Role Details (permissions + user attach/detach)
- **Exports**: `default function RoleTab()`; internal `RoleShow`.
- **Purpose**: Role detail page (`/dashboard/roles/:id`). The role's **permissions table is the main
  content** (shown directly under the header, NOT inside a tab) plus Users/Statistics tabs below.
- **Key details**:
  - Dispatcher: `Number(id)` → `RoleShow`, else `ErrorAndRedirect` to `/dashboard/roles`.
  - `RoleShow`: loads `Role.find(roleId)` (404 → redirect to `/dashboard/roles`); header with role
    `name`, `guard_name` + Back button.
  - **Permissions** (main content): a `ModelDataTable` bound to `Permission` at
    `url={`/role/${roleId}/permission`}` (backed by `RoleController::indexPermissions`,
    `permission.view`-gated). Row click navigates to `/dashboard/permissions/{row.id}` (the
    `PermissionTab`).
  - Below, `Tabs` — **Users** (the attach/detach card) and **Statistics** (`<RoleStats roleId={roleId} />`).
    Statistics tab renders only for `can({ roles: ["super-admin", "admin"] })`.
  - Attached list: rows with avatar (`user.image_url`), name, login and a `Detach` button
    (`Role.detachUser`, gated by `role.detach`), empty-state message when none. Multi-select `Combobox`
    (chips + searchable list) of `all` minus attached ones; `Attach` runs
    `Promise.all(selectedIds.map(userId => Role.attachUser(roleId, userId)))`, then `refresh()`
    re-runs `indexUsers`. The attach list renders only for `can({ permission: "role.attach" })`.

### `PermissionsTab.tsx` — Permissions (list)
- **Exports**: `default function PermissionsTab()`.
- **Purpose**: Server-driven permission table via `ModelDataTable` bound to `Permission` (Spatie
  permissions). Read-only list — no create/update/delete (permissions are seeded by `SecuritySeeder`).
- **Key details**: Passes custom `columns` (ID, Name, Guard). Row click navigates to
  `/dashboard/permissions/{id}` (the `PermissionTab`). Backend-gated: routes carry
  `permission:permission.view`, so only `super-admin`/`admin` can list them. Reachable via the
  "Permissions" sidebar item and from the RoleTab permissions table.

### `PermissionTab.tsx` — Permission Details (roles + users)
- **Exports**: `default function PermissionTab()`; internal `PermissionShow`.
- **Purpose**: Permission detail page (`/dashboard/permissions/:id`). Read-only — shows which **roles**
  grant the permission and which **users** hold it (directly or via a role).
- **Key details**:
  - Dispatcher: `Number(id)` → `PermissionShow`, else `ErrorAndRedirect` to `/dashboard/permissions`.
  - `PermissionShow`: loads `Permission.find(permissionId)` (404 → redirect to `/dashboard/permissions`);
    header with permission `name`, `guard_name` + Back button.
  - Content is wrapped in `Tabs` — **Roles** and **Users**, both rendered via `ModelDataTable`:
    - **Roles**: `model={Role}` at `url={`/permission/${permissionId}/role`}`
      (`PermissionController::indexRoles`), row click → `/dashboard/roles/{row.id}`. Tab gated by
      `role.view`.
    - **Users**: `model={User}` at `url={`/permission/${permissionId}/user`}`
      (`PermissionController::indexUsers`), row click → `/dashboard/users/{row.id}`. Tab gated by
      `user.view`.

### `SettingsTab.tsx` — Settings (profile)
- **Exports**: `default function SettingsTab()`.
- **Purpose**: Current user's profile editor: avatar/initials preview, `name` field, avatar via
  `ImagePicker`.
- **Key details**: Submits `User.editProfile(formData)` (POST `/auth/profile` with `_method: "PUT"`,
  multipart). Reads `User.current`; returns `null` when not logged in. Successful save refreshes the
  cached user (the sidebar/dropdown avatars update).

### `StatisticsTab.tsx` — Statistics (general overview)
- **Exports**: `default function StatisticsTab()`.
- **Purpose**: General statistics overview backed by `GET /statistics/general` (model:
  `models/Statistics.ts`, gated by `role:super-admin,admin`). No drill-down navigation — per-entity
  statistics now live as inner "Statistics" tabs on each model page (via `StatisticsViews`).
- **Key details**:
  - Fetches `Statistics.general()` on mount into one state object; skeleton cards render while
    `stats` is undefined. Abort via a `cancelled` flag in `useEffect`.
  - Reuses `StatCard` / `StatusBreakdown` from `StatisticsViews`. Layout: total-count cards row
    (users, roles, domains, apps, versions, bundles), then a users/versions/bundles summary grid
    (users with/without domain, version status chips, bundle status chips).

---

## Auth SPA (`apps/auth/`)

Served by the `auth` Blade view for `/login`, `/register`, and the `auth{any}` catch-all. No router — the
entry (`apps/auth/index.tsx`) picks the page from `window.location.pathname`:
- **`Login`** (`index.tsx`, default): email/password with LDAP fallback, "Remember me" checkbox, password
  visibility toggle. Uses react-hook-form; on success `window.location.href = DashboardRouter.getPath("home")!`.
- **`Register`** (`register.tsx`): invitee account activation. Reads `token` from the URL query (the
  invite link from `UserController::invite`). Renders an "Invalid invite link" card when `token` is
  missing. Fields: `code` (**typed by hand** — it is emailed to the user, not in the URL), `name`,
  `login` (email), `password` + `password_confirmation` (min 8). Submits
  `Request.post("/auth/register", data)` with `Authorization: Bearer <token>` (the invite token, deleted
  server-side on success) → redirects to `/auth/login`. Error fields are mapped via `setError`, global
  message via root `Alert`.

---

## Quick reference — which primitive for what

| Need | Use |
|------|-----|
| Clickable action | `Button` (+ `render` for polymorphic) |
| Confirm destructive action | `AlertDialog` |
| Modal form / info | `Dialog` |
| Side panel | `Sheet` or `Drawer` (swipe) |
| Mobile nav | `Drawer swipeDirection="left"` (see `AppNavbar`) |
| Desktop nav shell | `Sidebar` family (see `SideMenu`, `Layout`) |
| Menus (avatar/user) | `DropdownMenu` |
| Text entry | `Input`, `Textarea`, `InputGroup` (+ addons/buttons) |
| Autocomplete / multi-select | `Combobox` (+ `ComboboxChips`) |
| Toggle | `Switch` |
| Check one / many | `Checkbox`, `RadioGroup` |
| Tabs | `Tabs` |
| Progress | `Progress` |
| Loading | `Spinner`, `Skeleton`, `LazySkeleton`, `RouteLoading` |
| Empty state | `Empty` family |
| Form field layout | `Field` family (`Field`, `FieldLabel`, `FieldContent`, `FieldError`, `FieldSet`) |
| List rows | `Item` family |
| Table | `Table` family or `ModelDataTable` for server-driven |
| Charts | `ChartContainer` + `ChartTooltipContent`/`ChartLegendContent` |
| Carousel / screenshots | `Carousel` |
| Pagination | `Pagination` |
| Tooltip | `Tooltip` |
| Scroll region | `ScrollArea` |
| Divider | `Separator` |
| Card container | `Card` family |
| Notice box | `Alert` family |
| Conditional render | `Visibility` |
