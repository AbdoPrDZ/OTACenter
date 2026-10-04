# Frontend Design System

The dashboard is **dark-first** with a **light theme + system option**, an **indigo/violet accent**, and
surfaces inspired by modern developer tools: neutral zinc/indigo neutrals, hairline borders, soft
elevation, generous spacing, and restrained motion. Everything is raw Tailwind utilities.

## Theme wiring

- `resources/css/app.css` is the single stylesheet. It starts with `@import "tailwindcss"` and
  `@import "@fontsource-variable/oxanium"`, then `@custom-variant dark (&:is(.dark *))`.
- **Dark is the default.** `resources/views/layout.blade.php` runs a tiny inline `<head>` script that
  reads `localStorage["otacenter-theme"]` (`dark` | `light` | `system`, default `dark`) and toggles the
  `.dark` class on `<html>` before first paint (no flash).
- `components/ui/theme.tsx` — `ThemeProvider` owns the current theme, persists it, and re-applies it on
  system changes; `ThemeToggle` is the light/dark/system segmented control in the topbar. `useTheme()`
  exposes `{ theme, resolved, setTheme }`.
- `hooks/use-mobile.ts` — `useIsMobile()` (`MOBILE_BREAKPOINT = 768`) decides the mobile drawer vs desktop sidebar.

## Tokens

`@theme` defines fonts, radii (`--radius-*`), shadows (`--shadow-*`), and animations
(`--animate-fade-in`, `--animate-scale-in`, `--animate-slide-up`, `--animate-slide-in-right/left`,
`--animate-shimmer`) with matching `@keyframes`. `@theme inline` maps semantic colour tokens that the
palettes in `:root` (light) and `.dark` (dark) fill in:

- Core: `background`, `foreground`, `card`, `popover`, `muted`, `accent`, `secondary`, `border`, `input`, `ring`.
- Brand: `primary` + `primary-foreground` + `primary-soft`.
- Status: `success|warning|info|destructive` each with `-foreground` and `-soft` variants.
- `sidebar-*` (sidebar chrome) and `chart-1..5`.

Because these are semantic utilities, use `bg-background`, `text-foreground`, `bg-card`,
`border-border`, `text-muted-foreground`, `bg-primary`, `text-primary`, etc. — the theme switch is automatic.
`primary-soft` and the status `-soft` colours are the tinted backgrounds used for icon tiles and badges.

## Fonts

- Body: `Instrument Sans` (self-hosted by `laravel-vite-plugin/fonts` via `bunny('Instrument Sans')` in
  `vite.config.js`; the Blade layout emits `@fonts`).
- Brand/display: `Oxanium Variable` (`--font-display`) — used only for the wordmark and hero headings.
- Mono: system stack via `font-mono` (URLs, keys, `kbd`).

## Layout shell

`apps/dashboard/components/Layout.tsx` is a fixed `h-dvh` flex row:

- Desktop: collapsible `<Sidebar>` (`w-64` ↔ `w-[4.5rem]`, persisted in `localStorage["otacenter-sidebar"]`).
- Mobile (`< md`): the sidebar becomes a `<Drawer side="left">` opened from the topbar hamburger.
- `<Topbar>` (sticky, `backdrop-blur`): collapse toggle, breadcrumbs/route title, command-palette
  trigger (`Ctrl/⌘ K`), `ThemeToggle`, `UserMenu`.
- Content scrolls in `<main>` inside a `max-w-7xl` centered container (`p-4 md:p-6`).

## Motion & a11y

- Animations are CSS-only (`animate-fade-in`, `animate-scale-in`, `animate-slide-up`,
  `animate-slide-in-left/right`). No animation library.
- `:focus-visible` draws a 2px `--ring` outline globally. Interactive primitives also use
  `focus-visible:ring-2 ring-ring/50`.
- Modals/drawers portal to `document.body`, lock body scroll, and close on `Escape`/backdrop.
- `prefers-reduced-motion` is not special-cased yet; animations are short and subtle.
