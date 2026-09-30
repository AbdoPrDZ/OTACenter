# Frontend Utils — API Connection & Modelization

Reference for the frontend data layer: the global axios setup, the typed request wrapper, the model
system, field decoding, and the concrete frontend models. These live in `resources/js/utils`,
`resources/js/types`, and `resources/js/models`.

## Contents
- [General conventions](#general-conventions)
- [API connection](#api-connection)
- [Modelization](#modelization)
- [Field decoding](#field-decoding)
- [Type definitions](#type-definitions)
- [Concrete models](#concrete-models)

---

## General conventions

- Path alias `@/` → `resources/js/`.
- Every API call flows: **model/static method → `Request` wrapper → `window.axios`**.
- All responses are normalized into the `Response<T>` envelope (`success`, `message`, `data`,
  `errors`, `status`, `all`) — the app code should check `response.success` and never throw on 4xx/5xx.
- The **UI & navigation layer** (cn, useIsMobile, file pickers, Router) is documented separately in
  [UTILS-UI.md](./UTILS-UI.md).

### Data-flow diagram
```
Component / Service
   │  calls model static or Request.*
   ▼
Model static (createModel: all/find/create/update/delete/save/remove)
   │  builds URL + params/body, sets dataField/dataEncoding
   ▼
Request.send (utils/http.ts)
   │  window.axios.request()
   ▼
encodeRequestResponse → Response<T> { success, message, data?, errors, status, all }
   │  (dataEncoding decodes raw payload → typed model/plain object)
   ▼
Caller (checks success, reads response.data / response.errors)
```

---

## API connection

### `utils/bootstrap.ts` — global axios setup (API part)
> The UI file-picker helpers in this file are documented in UTILS-UI.md.
- **Side effects on import**:
  - `import "../../css/app.css"` (loads the single Tailwind v4 stylesheet — see UTILS-UI.md).
  - Sets `window.axios = axios` (augments `Window` via `declare global`).
  - `baseURL = (import.meta.env.VITE_APP_URL || "") + "/api"` — all requests target the `/api` API.
  - Default headers: `X-Requested-With: XMLHttpRequest`, `Accept: application/json`.
  - `withCredentials = true`, `withXSRFToken = true` (Laravel Sanctum SPA auth).
  - Response interceptor: on HTTP **419** (CSRF token expired) → `window.location.reload()`.
  - Reads `<meta name="csrf-token">` and sets `X-CSRF-TOKEN` header when present.
- **Exported (API-relevant)**: nothing — this is a bootstrap module; consumers use `window.axios`
  directly (e.g. `utils/http.ts` and the multipart headers in `utils/model.ts`).
- **Key details**: the baseURL ends in `/api`, so request URLs are relative paths like
  `"/auth/login"`, `"/app"`, `"/app/5"`.

### `utils/http.ts` — `Request` (typed HTTP wrapper)
- **Exported**: `default class Request`.
- **Purpose**: Wraps `window.axios.request` and normalizes every response into `Response<T>`; converts
  axios errors into a failed `Response` instead of throwing.
- **Static methods**: `send<T>`, `get<T>`, `post<T>`, `put<T>`, `patch<T>`, `delete<T>`, `head<T>` —
  all accept `RequestProps<T>` (`AxiosRequestConfig` + `dataField?` + `dataEncoding?`) and return
  `Promise<Response<T>>`. The verb methods just set `method` and delegate to `send`.
- **`encodeRequestResponse(response, dataField?, dataEncoding?)`** (module-private):
  - Reads `success` (default `status < 400`), `message` (default `statusText`), `errors` from body.
  - `data = dataField ? response.data[dataField] : rest` — a `dataField` like `"item"` / `"user"`
    extracts the payload; otherwise the whole body remainder is the data.
  - `data = success ? (dataEncoding ? await dataEncoding(data) : data) : undefined`.
  - Returns `{ success, message, data, errors, status, all: response.data }`.
- **Error path**: `AxiosError` → `{ success: false, message: error.response?.data.message ?? error.message, errors: error.response?.data.errors ?? {}, status: 500, all: error.response?.data }` (note: status hardcoded 500). Non-axios errors are rethrown.
- **Logging**: `send` logs timestamped lines to the console (useful for network debugging):
  `[YYYY-MM-DD HH:mm:ss.SSS] REQUEST  {method} {url}`, `RESPONSE {label} ({elapsed}ms, status {code})`,
  and `ERROR {label} ({elapsed}ms)` — every request, response, and failure is stamped and logged. Keep
  for now; it was added to trace duplicate requests.
- **Usage**: `Request.post<IUser>({ url: "/auth/login", data })`; or via model statics.

### `utils/permissions.ts` — RBAC helpers
- **Exported**: `interface RouteAccess`, `hasRole(role)`, `isSuperAdmin()`, `hasPermission(permission)`,
  `can(access?)`, `canAny(permissions)`.
- **Purpose**: Frontend RBAC. Reads `User.current` (the cached `/auth/me` payload) — `roles: string[]`
  and `permissions: string[]` are returned by the backend and decoded by `User.decode` (see
  `models/User.ts`). Powers the dashboard's nav filtering, route guard, and gated action buttons.
- **`RouteAccess`**: `{ permission?: string; roles?: string[] }`. When both are set they are **ANDed**.
- **Semantics** (mirror the backend `EnsurePermission` middleware):
  - `hasRole(role)` — `User.current?.roles?.includes(role) ?? false`.
  - `isSuperAdmin()` — `hasRole("super-admin")`.
  - `hasPermission(permission)` — `isSuperAdmin()` short-circuits to `true` (a super-admin has no
    explicit permission grants but passes every check, exactly like the middleware); otherwise checks
    `User.current.permissions`.
  - `can(access?)` — `undefined`/empty → allowed; `roles` → at least one held; `permission` →
    `hasPermission`. **Note**: super-admin only bypasses the *permission* half — a `roles` requirement
    still requires holding one of those roles (e.g. `{ roles: ["super-admin","admin"] }`).
  - `canAny(permissions)` — true if at least one permission is held.
- **Usage**: `can({ permission: "app.create" })` around mutating buttons/forms;
  `can({ roles: ["super-admin", "admin"] })` for the statistics tabs; `can(item.access)` to filter nav
  items (see `components/navigation.ts` + `Layout`'s guard).
- **Tests**: `utils/permissions.test.ts` — sets `User._currentUser` via a private-field cast and covers
  every helper + the AND semantics and super-admin edge cases.

---

## Modelization

### `utils/model.ts` — `Model` base + `createModel` factory
- **Exported**: `class Model<MT extends IModel>`, `function createModel<MT>(modelName, fields, postWithMultipart?)`.
- **Purpose**: Base class giving a record-style instance API over typed model data, plus a factory that
  generates a fully wired CRUD class bound to one REST endpoint.
- **`Model<MT>` instance API**:
  - `getAttr<K>(key): MT[K]` / `setAttr<K>(key, value)` / `setAttrs(partial)` / `toJSON()`.
  - `static createProxy(item)` → a `Model & MT` **Proxy**: unknown property gets/sets forward to
    `getAttr`/`setAttr`, so `user.name` works directly on instances. (The factory's decoded records are
    plain objects; the proxy is available but not used by the factory decode path.)
- **`createModel<MT>(modelName, fields, postWithMultipart = false)`** returns an anonymous class
  extending `Model<MT>`:
  | Static member | Signature | Behavior |
  |---------------|-----------|----------|
  | `modelName` | `string` | set from arg |
  | `endpoint` | `string` | `"/" + modelName` |
  | `decode(data)` | `(data) => Promise<MT>` | Maps each `Field` config through `decodeField` → typed record |
  | `all(props?)` | `(FetchAllProps?) => Promise<Response<ItemsResponse<MT>>>` | GET endpoint; encodes `pagination`/`sort`/`filter` into query params; `dataEncoding` decodes each item; `url` overrides endpoint |
  | `create(data, multiPart?)` | `(Partial<MT> \| FormData, boolean?)` | POST with `_method: "POST"`, `dataField: "item"`, decoded; multipart header when enabled |
  | `find(id)` | `(number)` | GET `/endpoint/{id}`, `dataField: "item"`, decoded |
  | `update(id, data, multiPart?)` | `(number, Partial<MT> \| FormData, boolean?)` | POST `/endpoint/{id}` with `_method: "PUT"`, `dataField: "item"`, decoded |
  | `delete(id)` | `(number)` | DELETE `/endpoint/{id}` |
  | *(instance)* `save()` | `()` | `update` if `data.id` else `create` |
  | *(instance)* `remove()` | `()` | `delete(data.id)` |
- **Key details**:
  - `all()` query params: `page`, `pageSize`, `search` (from `filter.quickFilterValues[0]`), `sort`
    (`{ [field]: sort }` object), `filter` (`{ [field]: value }` from `filter.items`).
  - Multipart headers: when `multiPart` true, sends `Content-Type: multipart/form-data` merged over
    `window.axios.defaults.headers.common`.
  - `create`/`update` accept either a plain object (injected `_method`) or raw `FormData` (appends
    `_method`). Uses POST even for update because Laravel needs the `_method` spoofing with multipart.
  - There are leftover commented-out `dataEncoding: this.decode.bind(this)` lines in `all/create/find/
    update` — the active code uses arrow-function wrappers instead.

---

## Field decoding

### `utils/fields.ts` — `decodeField`
- **Exported**: `function decodeField<T>(fieldConf, rawData): Promise<T | undefined>`.
- **Purpose**: Extract and validate one field from a raw API record based on its `Field` config.
- **Behavior** (`decodeFieldValue`, module-private):
  - `undefined` → `null`; `null` → `defaultValue` if set, else throw if `required`, else `undefined`.
  - `string`: must be a string.
  - `boolean`: `null` → `false`; must be a boolean.
  - `enum`: field must be `EnumField` with `enum: string[]`; raw must be one of the allowed values.
  - `number`: string coerced via `parseFloat`; must be a number.
  - `date`: string parsed via `new Date()`; `NaN` throws; returns a JS `Date`.
  - `array`: must be an array; passed through as-is (used for eager-loaded relations like the
    `domains` array on app/user rows).
  - unknown type → throws `Unknown field type`.
- **Usage**: called by every model's `decode`; the field types live in `types/field.ts`.

---

## Type definitions

### `types/http.ts`
- `Response<T>`: `{ success: boolean; message: string; data?: T; errors: Record<string, string>; status: number; all?: any }`.
- `RequestProps<T, D = any>`: `AxiosRequestConfig<D> & { dataField?: string; dataEncoding?: (data: Record<string, any>) => Promise<T> }`.

### `types/model.ts`
- `IModel`: `{ id: number; created_at: string; updated_at: string }` — every model extends this.
- `LazyValue<T>`: `{ id; field: Field<T>; fetch: () => Promise<T> }` (defined; no current consumers).
- `PaginationProps`: `{ pageSize?; page? }`.
- `SortItem` / `SortModel`: `{ field; sort: 'asc'|'desc'|null|undefined }[]`.
- `FilterItem`: `{ id?; field; value?; operator: '='|'!='|'>'|'>='|'<'|'<=' }`.
- `FilterModel`: `{ items; logicOperator?: 'and'|'or'; quickFilterValues?; quickFilterLogicOperator?; quickFilterExcludeHiddenColumns? }`.
- `FetchAllProps`: `{ pagination?: PaginationProps; sort?: SortModel; filter?: Partial<FilterModel>; url?: string }`.
- `ItemsResponse<T>`: `{ items: T[]; itemsCount: number; pagesCount: number; page: number }`.
- `DataTableColumn<T>`: `{ field: keyof T | string; headerName: string; flex?; minWidth?; maxWidth?; renderCell?: ({ row }) => ReactNode }` (consumed by `ModelDataTable`).

### `types/field.ts`
- `FieldTypes` = `['string','number','boolean','date','enum','array']`.
- `BaseField<T>`: `{ name: string; type: (typeof FieldTypes)[number]; required?; defaultValue?: T }`.
- `EnumField extends BaseField<string>`: adds `enum: string[]`.
- `Field<T>` = `BaseField<T> | EnumField`.

---

## Concrete models

Frontend models mirror the backend resources. All are created with `createModel(name, fields, true)`
— i.e. **multipart-capable** (file uploads for logos/images). The factory gives every model
`all/find/create/update/delete` (see [Modelization](#modelization)); nested resources add scoped
statics (e.g. `allForApp`, `store`, `destroy`) that override the URL.

### `models/App.ts` — `IApp` + `App`
- **Shape**: `id, name, package_name, summary, description, logo_url?, domain?: IDomain,
  domains?: IDomain[], created_at, updated_at`.
- **Fields**: `id:number`; `name/package_name/summary/description: string required`;
  `logo_url:string`;
  `domains:array` (eager-loaded from `AppController::index` → `load: ['domains']`);
  `created_at/updated_at:date`.
- **Extra**: `static getDataTableColumns()` → ID, Name, Package Name, Description (used by
  `ModelDataTable`).

### `models/Version.ts` — `IVersion` + `Version` (nested under app)
- **Shape**: `id, app_id, name, changelog, status: "draft"|"review"|"published"|"cancelled", file_id,
  api_key, latest_id?: number|null, created_at, updated_at`.
- **Fields**: `name:string required`; `api_key:string required` (new — a version's app-store/bundle API
  key; the create/edit forms now collect it); `status:enum` (`["draft","review","published","cancelled"]`);
  `latest_id:number|null` (the version's active bundle).
- **Extra statics**:
  - `endpointFor(appId)` → `/app/{appId}/version`.
  - `allForApp(appId, props?)` → `all()` with the nested URL.
  - `show(appId, versionId)` → GET `/app/{appId}/version/{versionId}` (`dataField: "item"`, decoded).
  - `store(appId, data, multiPart=true)` → POST the nested URL (appends `_method: "POST"`).
  - `updateForApp(appId, versionId, data, multiPart=true)` → POST `/app/{appId}/version/{versionId}`
    with `_method: "PUT"` (named `updateForApp` because it can't override the factory's
    `update(id, data, multiPart)` static — different signature).
  - `destroy(appId, versionId)` → DELETE `/app/{appId}/version/{versionId}`.
  - `getDataTableColumns()` → ID, Name, Changelog, Status.

### `models/Bundle.ts` — `IBundle` + `Bundle` (nested under app/version)
- **Shape**: `id, version_id, name, file_id, url?, created_at, updated_at` — `name` is the bundle version
  string and is **required by the backend** (column NOT NULL) and enforced as required in the BundleTab
  create/edit forms.
- **Extra statics**:
  - `endpointFor(appId, versionId)` → `/app/{appId}/version/{versionId}/bundle`.
  - `allForVersion(appId, versionId, props?)` → `all()` with the nested URL.
  - `store(appId, versionId, data, multiPart=true)` → POST the nested URL (ZIP installer file).
  - `show(appId, versionId, bundleId)` → GET the nested item.
  - `updateForVersion(appId, versionId, bundleId, data, multiPart=true)` → POST
    `/app/{appId}/version/{versionId}/bundle/{bundleId}` with `_method: "PUT"` (named
    `updateForVersion` because it can't override the factory's `update` static — different signature).
  - `activate(appId, versionId, bundleId)` → POST `.../bundle/{bundleId}/activate` (sets
    `versions.latest_id` on the backend).
  - `destroy(appId, versionId, bundleId)` → DELETE the nested item.
  - `getDataTableColumns()` → ID, Name, URL.
- **Key details**: `url` is the bundle's downloadable installer URL (points to the stored `File`).

### `models/AppScreenshot.ts` — `IAppScreenshot` + `AppScreenshot` (nested under app)
- **Shape**: `id, app_id, file_id, name, disk, created_at, updated_at`.
- **Extra statics**:
  - `endpointFor(appId)` → `/app/{appId}/screenshot`.
  - `allForApp(appId, props?)` → `all()` with the nested URL.
  - `store(appId, data, multiPart=true)` → POST the nested URL.
  - `destroy(appId, screenshotId)` → DELETE `/app/{appId}/screenshot/{screenshotId}`.
  - `getUrl(name)` → `${window.location.origin}/files/{name}` (the `GET /files/{name}` route).
  - `getDataTableColumns()` → ID, File.
- **Key details**: No `dataEncoding` on `store` (raw item returned).

### `models/Domain.ts` — `IDomain` + `Domain`
- **Shape**: `id, name, description, image_url?, created_at, updated_at`.
- **Fields**: `id:number`; `name:string required`; `description:string`; `image_url:string`;
  `created_at/updated_at:date`.
- **Extra statics** (binding — domain is the hub linking apps & users):
  - `indexByApp(appId, props?)` → `all()` at `/app/{appId}/domain`.
  - `indexByUser(userId, props?)` → `all()` at `/user/{userId}/domain`.
  - `bindApp(appId, domainId)` → POST `/app/{appId}/domain/{domainId}`.
  - `unbindApp(appId, domainId)` → DELETE `/app/{appId}/domain/{domainId}`.
  - `bindUser(userId, domainId)` → POST `/user/{userId}/domain/{domainId}`.
  - `unbindUser(userId, domainId)` → DELETE `/user/{userId}/domain/{domainId}`.
  - `getDataTableColumns()` → ID, Name, Description.
- **Key details**: Used by `AppTab.DomainsSection` (app↔domain) and `UserTab` (user↔domain).

### `models/User.ts` — `IUser` + `User` (auth-aware)
- **Shape**: `id, name, login, image_url, domains?: IDomain[], roles?: string[],
  permissions?: string[], created_at, updated_at`
  (fields: `name`/`login` required; `domains:array` eager-loaded from `UserController::index` →
  `load: ['domains']`; `roles:array` and `permissions:array` come from the `/auth/me` &
  `/auth/profile` payload — `userPayload()` in `AuthController`, see backend docs).
- **Extra statics** (beyond the factory):
  - `login(data: FieldValues)` → `Request.post("/auth/login", data)`.
  - `invite(data: { name; email; role; domain_id? })` → `Request.post("/user/invite", data)` — admin-only
    (`user.invite`); `data` on success is the raw body `{ link }` (no `dataField`/`dataEncoding`), where
    `link` is the `/register?token=...` URL to hand to the invitee. The registration code is **not**
    returned — it is emailed to the user separately (mail not wired yet) and typed manually on the
    register page.
  - `get current` → cached `_currentUser: IUser | undefined` (set by `auth()` / `editProfile()`).
  - `auth()` → `Request.get("/auth/me", dataField: "user", decoded)`; on success caches `_currentUser`.
  - `editProfile(data)` → POST `/auth/profile` with `_method: "PUT"`, multipart headers; on success caches `_currentUser`.
  - `logout()` → `Request.delete("/auth/logout")`; on success redirects `window.location.href = '/auth/login'`.
  - `getDataTableColumns()` → ID, Name, Login.
  - `indexRoles(userId, props?)` → `Role.all({ ...props, url: "/user/{userId}/role" })` — the user's
    directly attached roles (feeds the UserTab Security tab).
  - `indexPermissions(userId, props?)` → `Permission.all({ ...props, url: "/user/{userId}/permission" })`
    — the user's **effective** permissions (direct + via role); each item carries a `direct` boolean
    (true = direct grant, false = inherited via a role). Consumed by the UserTab Security tab.
  - `attachPermission(userId, permissionId)` → POST `/user/{userId}/permission/{permissionId}`.
  - `detachPermission(userId, permissionId)` → DELETE `/user/{userId}/permission/{permissionId}`.
- **Key details**: `User.current` is the app-wide auth cache read by the dashboard shell (`SideMenu`,
  `AppNavbar`, `UserMenu` render nothing user-related when it's `undefined`) **and** by the RBAC helpers
  in `utils/permissions.ts` (which read `current.roles`/`current.permissions`). `User.logout()` is wired to
  the Logout menu items.

### `models/Role.ts` — `IRole` + `Role` (Spatie roles)
- **Shape**: `id, name, guard_name, created_at, updated_at`.
- **Fields**: `id:number`; `name:string required`; `guard_name:string`; `created_at/updated_at:date`.
- **Extra statics** (user↔role / permission↔role binding):
  - `indexUsers(roleId, props?)` → `Request.get` `/role/{roleId}/user`, **decoding items with
    `User.decode`** (NOT `this.all()` — the items are users, not roles).
  - `indexPermissions(roleId, props?)` → `Permission.all({ ...props, url: "/role/{roleId}/permission" })`
    — the role's permissions (feeds the RoleTab permissions table).
  - `attachUser(roleId, userId)` → POST `/role/{roleId}/user/{userId}`.
  - `detachUser(roleId, userId)` → DELETE `/role/{roleId}/user/{userId}`.
  - `getDataTableColumns()` → ID, Name, Guard.
- **Key details**: Read-only in the UI (roles are seeded by `SecuritySeeder`). Used by `RolesTab`
  (list) and `RoleTab` (permissions table + attach/detach users). Backend routes are gated by
  `role.view`/`role.attach`/`role.detach`/`permission.view` → `super-admin`/`admin` only.

### `models/Permission.ts` — `IPermission` + `Permission` (Spatie permissions)
- **Shape**: `id, name, guard_name, direct?, created_at, updated_at`.
- **Fields**: `id:number`; `name:string required`; `guard_name:string`; `direct:boolean` (only present on
  `GET /user/{user}/permission` — true = directly granted, false = inherited via a role); `created_at/
  updated_at:date`.
- **Extra statics** (permission → roles/users lookups, all read-only):
  - `indexRoles(permissionId, props?)` → `Request.get` `/permission/{permissionId}/role`, **decoding
    items with `Role.decode`** — roles that grant this permission.
  - `indexUsers(permissionId, props?)` → `Request.get` `/permission/{permissionId}/user`, **decoding
    items with `User.decode`** — users holding the permission directly or via a role.
  - `getDataTableColumns()` → ID, Name, Guard.
- **Key details**: Read-only (permissions are seeded by `SecuritySeeder`; no create/update/delete).
  Used by `PermissionsTab` (list), `PermissionTab` (Roles/Users tables), and `RoleTab` (permissions
  table via `Role.indexPermissions` → `Permission.all` with a custom URL). Backend routes are gated
  by `permission.view` → `super-admin`/`admin` only.

### `models/Statistics.ts` — `Statistics` (aggregate read-only model)
- **Shape**: NOT a `createModel` resource — a plain static class. Exports one interface per endpoint:
  `GeneralStatistics`, `UserStatistics`, `RoleStatistics`, `DomainStatistics`, `AppStatistics`,
  `VersionStatistics`, plus the union `StatisticsItem` (item payloads of all `by*` endpoints).
- **Extra statics** (all `Request.get`; `general` returns `{ statistics }`, the `by*` endpoints return
  the full `{ item, statistics }` envelope — NO `dataField`):
  - `general()` → `GET /statistics/general` — aggregate totals + with/without breakdowns
    (`users`, `roles`, `domains`, `apps`, `versions`, `bundles`) and status chips
    (`versions.by_status`, `bundles.by_status`). No per-entity lists anymore.
  - `byUser(id)` → `GET /statistics/user/{id}` — user's roles/domains lists + counts.
  - `byRole(id)` → `GET /statistics/role/{id}` — role's users list + count.
  - `byDomain(id)` → `GET /statistics/domain/{id}` — domain's users/apps lists + counts.
  - `byApp(id)` → `GET /statistics/app/{id}` — app's versions (with `bundles_count`), statuses, domains.
  - `byVersion(id)` → `GET /statistics/version/{id}` — version's bundles, active bundle.
- **Key details**: Consumed by `StatisticsTab` (general) and, since the old `/dashboard/statistics/*`
  detail routes were removed, by the per-entity panels in `StatisticsViews` (`UserStats`, `RoleStats`,
  `DomainStats`, `AppStats`, `VersionStats`) embedded as inner tabs on the model pages. All six
  endpoints are gated by `role:super-admin,admin`.
