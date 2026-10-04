# Frontend Context — INDEX

Map of the OTACenter React frontend. **This replaces the old shadcn/Base UI docs** — the frontend was
rebuilt in 2026 with a plain Tailwind CSS v4 + React design (no component library), keeping the data
layer and `ModelDataTable` behaviour.

- [DESIGN.md](./DESIGN.md) — design system, theme tokens, `app.css`, layout shell, theming.
- [COMPONENTS.md](./COMPONENTS.md) — every component (`ui/` primitives, shared components, dashboard shell, tabs).
- [DATA.md](./DATA.md) — axios bootstrap, `Request`, `Model`/`createModel`, field decoding, models, permissions.
- [NAVIGATION.md](./NAVIGATION.md) — `Router`/`DashboardRouter`, route table, nav config, access control.
- [TESTS.md](./TESTS.md) — Vitest/Testing Library setup and conventions.

## Stack

| Concern | Choice |
|---------|--------|
| UI | React 19 + TypeScript, **raw Tailwind utilities** — no shadcn, no Base UI |
| Styling | Tailwind CSS v4, CSS-first (`resources/css/app.css`), no `tailwind.config.js`/`postcss.config.js` |
| Primitives | Hand-built in `resources/js/components/ui/` |
| Table | `@tanstack/react-table` v9 (features API), wired in `ModelDataTable` |
| Forms | `react-hook-form` |
| HTTP | `axios` via `utils/http.ts` (`Request`) + `utils/model.ts` (`createModel`) |
| Routing | `react-router-dom` v7 wrapped by `utils/router.tsx` |
| Icons | `lucide-react` |
| Fonts | `Instrument Sans` (body, self-hosted via `laravel-vite-plugin/fonts`), `Oxanium Variable` (brand/display) |

## Directory map

```
resources/
  css/app.css                       # the single stylesheet (theme tokens + palettes)
  views/                            # Blade shells: layout, dashboard, auth, welcome
  js/
    apps/
      home/                         # Public landing SPA (/): index.tsx, components/HomePage.tsx
      docs/                         # MDX docs SPA (/docs): index.tsx, router.tsx, manifest.ts, components/, content/
      auth/                         # Login + Register SPA (index.tsx, register.tsx, AuthShell.tsx)
      dashboard/                    # Dashboard SPA
        index.tsx                   # entry: auth bootstrap + providers
        router.tsx                  # DashboardRouter (named routes + lazy tabs)
        components/                 # Layout, Sidebar, Topbar, UserMenu, CommandPalette
        tabs/                       # one file per route/page
    components/
      ui/                           # plain-Tailwind primitives
      *.tsx                         # shared components (ModelDataTable, PageHeader, ...)
      navigation.ts                 # NAV_ITEMS + ROUTE_ACCESS
    models/                         # frontend models (App, Version, Bundle, ...)
    types/                          # field/http/model/router types
    utils/                          # bootstrap, http, model, fields, permissions, router
    lib/utils.ts                    # cn()
    hooks/use-mobile.ts             # useIsMobile()
```

## Ground rules

1. **Never** import `@base-ui/*`, `shadcn/*`, `tw-animate-css`, or any shadcn component. They were
   removed from `package.json` on purpose.
2. **Never** add the Tailwind v3 `@tailwind base/components/utilities` directives. Use
   `@import "tailwindcss"` in `resources/css/app.css` only.
3. New tokens go in the `@theme` / `@theme inline` blocks, new palettes in `:root` / `.dark`.
4. `resources-old/` is a **frozen fallback copy** of the previous UI. Do not import from it.
