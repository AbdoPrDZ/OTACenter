# Frontend Data Layer

The data layer was **carried over unchanged** from the previous UI (it contains no styling). It lives in
`resources/js/utils`, `resources/js/types`, and `resources/js/models`.

## Contents
- [Data flow](#data-flow)
- [API connection](#api-connection)
- [Permissions](#permissions)
- [Modelization](#modelization)
- [Field decoding](#field-decoding)
- [Types](#types)
- [Concrete models](#concrete-models)

---

## Data flow

```
Component
  └─ model static (all/find/create/update/delete + nested helpers)
       └─ Request.{get,post,put,delete} (utils/http.ts)
            └─ window.axios.request
                 └─ encodeRequestResponse → Response<T> { success, message, data?, errors, status, all }
```

Every call resolves to a `Response<T>` — **never throws on 4xx/5xx**. Check `response.success` and read
`response.data` / `response.errors`.

---

## API connection

### `utils/bootstrap.ts`
Side effects on import (pulled in by both SPA entries):
- `import "../../css/app.css"` — loads the single stylesheet.
- Sets `window.axios = axios`; `baseURL = (VITE_APP_URL || "") + "/api"`; default headers
  `X-Requested-With`, `Accept: application/json`; `withCredentials`/`withXSRFToken = true`; reads
  `<meta name="csrf-token">` into `X-CSRF-TOKEN`; response interceptor reloads on **419** (CSRF expired).

Also exports the file pickers: `selectFile(contentType, multiple?)`, `pickImage(multiple?)`, `pickImages()`.

### `utils/http.ts` — `Request`
`send/get/post/put/patch/delete/head` accept `RequestProps<T>` (`AxiosRequestConfig` + `dataField?` +
`dataEncoding?`) and return `Response<T>`. `dataField` extracts `response.data[dataField]`;
`dataEncoding` maps the raw payload to a typed value. Axios errors become `{ success: false, ... }`
(status hardcoded 500). Each request/response/error is console-logged with a timestamp.

---

## Permissions

### `utils/permissions.ts`
Frontend RBAC reading the cached `User.current` (`roles: string[]`, `permissions: string[]`).

- `hasRole(role)`, `isSuperAdmin()`, `hasPermission(permission)` (super-admin short-circuits to true).
- `can(access?: RouteAccess)` — `undefined`/empty → allowed; `roles` and `permission` are ANDed.
- `canAny(permissions)`.
- `PRIVILEGED_ROLES = ["super-admin", "admin", "developer"]`, `isPrivilegedRole()` — privileged roles see
  privileged form fields (uploads, api_key, …), mirroring the backend model `toArray()` switch.

Used for nav filtering, the route guard, gated buttons/forms, and privileged-only fields.

---

## Modelization

### `utils/model.ts` — `Model` + `createModel`
`createModel<MT>(modelName, fields, postWithMultipart?)` returns a class with:

| Static | Behaviour |
|--------|-----------|
| `all(props?)` | GET endpoint; encodes `pagination`/`sort`/`filter`; decodes each item into `ItemsResponse<MT>` (`{ items, itemsCount, pagesCount, page }`). `url` overrides the endpoint. |
| `create(data, multiPart?)` | POST with `_method: "POST"`, `dataField: "item"`, decoded. |
| `find(id)` | GET `/endpoint/{id}`, decoded. |
| `update(id, data, multiPart?)` | POST `/endpoint/{id}` with `_method: "PUT"`, decoded. |
| `delete(id)` | DELETE `/endpoint/{id}`. |

`all()` query params: `page`, `pageSize`, `search` (from `filter.quickFilterValues[0]`),
`sort` (`{ field: "asc"|"desc" }`), `filter` (from `filter.items`). Multipart sends
`Content-Type: multipart/form-data`.

---

## Field decoding

### `utils/fields.ts` — `decodeField`
Validates/coerces one field per its `Field` config: `string`, `number` (parseFloat), `boolean`,
`date` (`new Date`), `enum` (must be in `enum: string[]`), `array` (pass-through, used for eager-loaded
relations like `domains`). Missing required fields throw.

---

## Types

- `types/http.ts` — `Response<T>`, `RequestProps<T>`.
- `types/model.ts` — `IModel` (`id`, `created_at`, `updated_at`), `ItemsResponse<T>`, `FetchAllProps`,
  `SortModel`, `FilterModel`, `DataTableColumn<T>` (`{ field, headerName, flex?, minWidth?, renderCell? }`).
- `types/field.ts` — `Field<T>` / `EnumField`.
- `types/router.ts` — `Route` (`{ name?, path, title?, params? }`).

---

## Concrete models

All are `createModel(name, fields, true)` (multipart-capable).

- **`App.ts`** — `IApp` (`name`, `package_name`, `summary`, `description`, `logo_url?`, `domains?`,
  `latest_id?`, `latest?`). `getDataTableColumns()`.
- **`Version.ts`** — nested under app: `endpointFor`, `allForApp`, `show`, `store`, `updateForApp`,
  `destroy`, `getDataTableColumns`. Fields include `name`, `api_key`, `changelog`, `status` enum,
  `latest_id`.
- **`Bundle.ts`** — nested under app/version: `endpointFor`, `allForVersion`, `store`, `show`,
  `updateForVersion`, `destroy`. (No `activate` static: the backend activate route was never wired into
  `routes/web.php`, so the UI does not offer activation.)
- **`AppScreenshot.ts`** — nested under app: `endpointFor`, `allForApp`, `store`, `destroy`,
  `getUrl(name)` → `/files/{name}`.
- **`Domain.ts`** — `getDataTableColumns`; `indexByApp/indexByUser`, `bindApp/unbindApp`,
  `bindUser/unbindUser`.
- **`User.ts`** — auth-aware: `login`, `auth()` (sets cached `_currentUser`), `editProfile`, `logout`,
  `invite`, cached `current`, `indexRoles`, `indexPermissions` (items carry `direct`), `attachPermission`,
  `detachPermission`.
- **`Role.ts`** — `getDataTableColumns`; `indexUsers` (decodes users), `indexPermissions`, `attachUser`,
  `detachUser`.
- **`Permission.ts`** — read-only; `indexRoles` / `indexUsers` (decode roles/users).
- **`Statistics.ts`** — plain static class (`general`, `byUser`, `byRole`, `byDomain`, `byApp`,
  `byVersion`), no `createModel`.
