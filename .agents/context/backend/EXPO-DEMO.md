# Expo updates & demo releases

Two features added together (migration `2026_11_13_000001_add_expo_and_demo_releases`):

1. **Expo support**: OTACenter speaks the Expo Updates protocol v1, so apps built with `expo-updates`
   (client package `expo-ota-client`) update from it on Android and iOS.
2. **Demo releases**: versions/bundles published only to devices of users in a domain with
   `allow_demo`, until promoted. Server-side, so they work for both bare React Native apps
   (`react-ota-client`, `client_type = ota-client`) and Expo apps.

The client packages: `react-ota-client` (npm name since 1.5.0; `ota-client` before) and `expo-ota-client`.
The `client_type` value `ota-client` is a stored enum value and keeps its name.

## Schema

| Table | Column | Meaning |
| --- | --- | --- |
| `domains` | `allow_demo` bool | Members may install demo releases of the domain's apps |
| `versions` | `client_type` `ota-client`\|`expo` | Bundle format and device routes. `file_id` is now nullable (an Expo build may ship via a store) |
| `versions` | `is_demo`, `promoted_at` | Demo flag; cleared + timestamped on promotion |
| `versions` | `demo_latest_id` → bundles | Demo bundle pointer (counterpart of `latest_id`) |
| `apps` | `demo_latest_id` → versions | Demo version pointer |
| `bundles` | `is_demo`, `promoted_at` | Same as versions |
| `bundles` | `expo_update_id` uuid, `expo_metadata` json | Set by the importer; `expo_metadata` = `{ metadata, expoConfig, runtime }` |
| `bundle_assets` | per platform & file: `path`, `key` (md5 hex), `hash` (base64url sha256, unpadded), `content_type`, `file_extension`, `is_launch_asset`, `size` | Files of an Expo bundle; one stored copy, one row per platform |
| `device_link_codes` | `user_id`, `app_id?`, `code_hash`, `expires_at`, `used_at`, `device_id` | One-time codes linking a device to a user |

Permission `device.link` (super-admin, admin) is created by the migration and `SecuritySeeder`.

## Services (`app/Services`)

- `Releases\DemoAccess::allows(?Device, App)` — device has `user_id`, and that user is in a domain with
  `allow_demo` that is bound to the app. Roles grant nothing.
- `Releases\ReleaseResolver` — **every** "what does this device get" decision goes through it:
  `bundleFor(version, device, ?platform)`, `versionFor(app, device)` (public pointer, plus the demo pointer
  when eligible; the **newer** wins, `isNewer()` = `created_at` then id), and `isHiddenDemo(item, device)`
  for artifact downloads.
- `Releases\ReleasePublisher` — moves pointers. Publishing a demo publicly **is** promotion (`is_demo=false`,
  `promoted_at`, demo pointer cleared). `bundlePublished()` / `versionPublished()` are called when
  `latest_id` is set through the generic `PUT` update endpoints, so those promote too.
- `Devices\DeviceRegistry` — shared device registration (`DeviceMiddleware` and the Expo manifest route).
- `Expo\ExpoBundleImporter` — zip of `npx expo export` (root or one top folder) → `bundle_assets`.
  Rejects zip-slip paths, > 512 MB uncompressed, missing files, and a runtime (form `runtime_version` or
  `expoConfig.json`) different from the version name.
- `Expo\ExpoUpdateResponse` — multipart/mixed manifest / `noUpdateAvailable` / `rollBackToEmbedded`
  responses, optional RSA-SHA256 signing (`config/ota.php`: `OTA_EXPO_SIGNING_KEY`, `OTA_EXPO_SIGNING_KEY_ID`),
  and **temporary signed asset URLs** (`OTA_EXPO_ASSET_URL_TTL`, minutes).
- `Expo\StructuredFields` — minimal RFC 8941 dictionary parse/serialize.

## Device routes (`routes/ota_client.php`, prefix `/ota-client/v1`)

| Route | Middleware | Notes |
| --- | --- | --- |
| `GET expo/{package}/manifest` | `ota.api_key` | Protocol headers `expo-protocol-version: 1` (else 406), `expo-platform`, `expo-runtime-version`. Device is **optional**: read from `Expo-Extra-Params` (`did`, `mf`, `br`, `mdl`, `av`, `sdv`) or `X-Device-Info`. |
| `GET expo/{package}/assets/{asset}` | `signed:relative` | The signature is the grant (no key/device header: expo-updates does not promise custom headers on asset requests). Records `DownloadHistory` for the launch asset. |
| `POST device/info` · `device/link` · `device/unlink` | `ota.api_key` + `device` | Body `{ package, version, code? }`. `link` is throttled 10/min and claims the code atomically. |

Manifest decision (`ExpoUpdatesController::manifest`): unknown runtime / non-Expo version → no update;
target = `ReleaseResolver::bundleFor(..., platform)`; none → `rollBackToEmbedded` if the device runs an
OTA bundle, else no update; same id → no update; device runs a **newer** bundle than the target (withdrawn
demo, lost access, public pointer moved back) → `rollBackToEmbedded`, and the next check serves the target
(expo-updates launches the newest update it has, so an older manifest can't be served directly).

`/app/info`: version/bundle availability go through the resolver; offered updates carry `demo`. A tester on a
demo **APK** newer than the public one is not offered the older APK. For Expo versions the reported bundle
name is not validated (`"embedded"` is fine).

`/app/update/{bundle,version}`: 404 for an unpromoted demo unless `DemoAccess::allows`.

## Admin routes (`routes/web.php`, under `/api`)

| Route | Permission |
| --- | --- |
| `POST app/{app}/version/{version}/activate` · `activate-demo` · `promote` | `version.publish` |
| `DELETE app/{app}/version/demo` (withdraw demo version) | `version.publish` |
| `POST …/bundle/{bundle}/activate-demo` · `promote` | `bundle.publish` |
| `DELETE …/version/{version}/bundle/demo` (withdraw demo bundle) | `bundle.publish` |
| `GET …/bundle/{bundle}/assets` | `bundle.view` |
| `POST auth/device-link-code` (own code, throttled) | auth only |
| `POST user/{user}/device-link-code` | `device.link` |
| `GET user/{user}/device` | `user.view` |
| `DELETE device/{device}/link` | `device.link` |

Bundle upload to an Expo version requires a `.zip` and runs the importer (422 + cleanup on failure). An Expo
bundle's file cannot be replaced (400): a changed export is a new bundle.

The public store, the private store and download links **never** serve a demo version (`is_demo = false`
on every fallback query).

## Tests

`ExpoUpdatesTest`, `DemoReleaseTest`, `DeviceLinkTest`. Gotchas: test classes must not declare `$app`
(Laravel's container property); switch users with `$this->app['auth']->forgetGuards()`; `created_at` is not
fillable (use `forceFill`); Windows PHP has no `openssl.cnf`, so the signing test passes a minimal one.

## Device testing status

Verified with the `expo-ota-client` example app (Expo SDK 58, Android, LAN server): a JS bundle published
here downloads through the manifest/asset routes and the app restarts into it; `/app/info` offers a newer
Expo version's APK, whose download matches the uploaded SHA-256.

Not yet verified on a device: the two-step downgrade via `rollBackToEmbedded`, `Expo-Extra-Params`
reaching the manifest route (demo eligibility of an Expo device depends on it), and iOS.
