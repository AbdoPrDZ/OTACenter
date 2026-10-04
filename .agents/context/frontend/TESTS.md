# Frontend Tests

Vitest + Testing Library, jsdom environment, CSS disabled.

## Commands

```bash
npm test           # vitest run
npm run test:watch # watch mode
```

## Config

- `vitest.config.js` — `environment: "jsdom"`, `setupFiles: ["./resources/js/test/setup.ts"]`,
  `css: false`, `include: ["resources/js/**/*.{test,spec}.{ts,tsx}"]`, alias `@` → `resources/js`.
- `resources/js/test/setup.ts` — imports `@testing-library/jest-dom/vitest` and registers
  `cleanup()` after each test.

## Existing tests

- `components/ModelDataTable.test.tsx` — asserts the **800 ms search debounce**: no fetch while typing,
  exactly one fetch 800 ms after the last keystroke, and the debounced value is sent as
  `filter.quickFilterValues`. Uses `vi.useFakeTimers()` and a fake model exposing `all` +
  `getDataTableColumns`.
- `apps/dashboard/router.test.ts` — route resolution/params, that params don't leak into the shared route
  table, explicit param substitution, and that the static `.../add` routes win over `:id`.
- `apps/dashboard/tabs/addRoutes.test.tsx` — renders the create forms for the static `app.add`,
  `app.version.add`, `app.version.bundle.add` routes (via `MemoryRouter`) and asserts no "Invalid … ID."
  error shows.
- `utils/permissions.test.ts` — all RBAC helpers, AND semantics, and the super-admin edge cases.

## Conventions

- The `useToast()` hook returns a **safe no-op** when no `ToastProvider` is present, so components that
  toast can be rendered in isolation without wrapping.
- For components that call the API, mock the model static (as `ModelDataTable.test.tsx` does) rather than
  the axios layer.
