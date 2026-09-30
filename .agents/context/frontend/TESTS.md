# Frontend Tests (Vitest + Testing Library)

Reference for the React test setup. Tests live next to the code they cover as
`*.test.tsx` / `*.spec.ts` under `resources/js`.

## Setup

- **Runner**: Vitest 4 (`vitest.config.js` at the project root — separate from
  `vite.config.js` to avoid the Laravel/tailwind plugins and font downloads).
- **Environment**: `jsdom`.
- **Library**: `@testing-library/react` + `@testing-library/jest-dom` (+ `user-event`,
  `@testing-library/dom`).
- **Alias**: `@` → `resources/js` (mirrors `tsconfig.json`).
- **Setup file**: `resources/js/test/setup.ts` imports `@testing-library/jest-dom/vitest`
  and registers `afterEach(cleanup)`. **`globals: false`** in vitest, so RTL's auto-cleanup
  does NOT run — the manual cleanup in setup.ts is required or DOM leaks between tests.
- **Config/`package.json`**: `npm test` (`vitest run`), `npm run test:watch` (`vitest`).

## Conventions

- Import `describe/it/expect/vi` from `vitest` explicitly (no globals).
- **Debounce tests use fake timers**: `vi.useFakeTimers()` in `beforeEach`,
  `vi.useRealTimers()` in `afterEach`, and advance with
  `await act(async () => { await vi.advanceTimersByTimeAsync(ms); })` so React state
  updates flush inside `act`.
- Fake `model` objects for `ModelDataTable` tests: `{ all: vi.fn().mockResolvedValue({...}),
  getDataTableColumns: () => [...] }` matching the `ModelStatic<MT>` contract; assert on
  `model.all` call counts and `toHaveBeenLastCalledWith`.

## Current coverage

- `resources/js/components/ModelDataTable.test.tsx` — search debounce:
  - no fetch while typing fast, exactly one request 800ms after the last keystroke;
  - the timer resets on every keystroke (pauses < 800ms never fetch);
  - the debounced value is sent as `filter: { quickFilterValues: [value] }`.
- `resources/js/utils/permissions.test.ts` — the RBAC helpers (`utils/permissions.ts`):
  - `hasRole`/`isSuperAdmin` role lookups against a mocked `User.current`;
  - `hasPermission` incl. the `super-admin` bypass (has every permission);
  - `can` semantics — no requirement allowed, permission required, roles required (any-of),
    AND when both set, and super-admin bypassing *permission* but not *role* requirements;
  - `canAny` at-least-one semantics and empty-list behavior.
  - The current user is injected by assigning the private `User._currentUser` field via a cast:
    `(User as unknown as { _currentUser?: unknown })._currentUser = user` (reset to `undefined` in
    `beforeEach` via `vi.restoreAllMocks()`).
