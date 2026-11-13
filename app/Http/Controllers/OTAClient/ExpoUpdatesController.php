<?php

namespace App\Http\Controllers\OTAClient;

use App\Http\Middleware\OtaApiKeyMiddleware;
use App\Models\App;
use App\Models\Bundle;
use App\Models\BundleAsset;
use App\Models\Device;
use App\Models\DownloadHistory;
use App\Models\Log;
use App\Models\Version;
use App\Services\Devices\DeviceRegistry;
use App\Services\Expo\ExpoUpdateResponse;
use App\Services\Expo\StructuredFields;
use App\Services\Releases\ReleaseResolver;
use App\Src\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Expo Updates protocol v1 server for apps built with `expo-updates`.
 *
 * `updates.url` = `{server}/ota-client/v1/expo/{package}/manifest`, with the
 * version's key in `updates.requestHeaders` as `API-KEY`.
 *
 * @see https://docs.expo.dev/technical-specs/expo-updates-1/
 */
class ExpoUpdatesController extends Controller
{
  public function manifest(Request $request, string $package)
  {
    $protocol = $request->header('expo-protocol-version');
    if ($protocol !== ExpoUpdateResponse::PROTOCOL_VERSION)
      return $this->apiSingleErrorResponse('expo-protocol-version', 'Only Expo Updates protocol version 1 is supported', [], 406);

    $platform = $request->header('expo-platform') ?? $request->query('platform');
    if (!in_array($platform, BundleAsset::PLATFORMS, true))
      return $this->apiSingleErrorResponse('expo-platform', 'Unsupported platform');

    $runtime = $request->header('expo-runtime-version') ?? $request->query('runtime-version');
    if (!is_string($runtime) || $runtime === '')
      return $this->apiSingleErrorResponse('expo-runtime-version', 'Missing runtime version');

    if ($request->hasHeader('expo-expect-signature') && !ExpoUpdateResponse::canSign())
      return $this->apiSingleErrorResponse('expo-expect-signature', ExpoUpdateResponse::SIGNING_UNAVAILABLE);

    $app = App::where('package_name', $package)->first();
    if (!$app) return $this->apiSingleErrorResponse('package', 'Invalid package name', [], 404);

    $version = Version::where('app_id', $app->id)->where('name', $runtime)->first();

    # The middleware already matched the key; repeat it so the controller never
    # trusts an unverified request (same as AppController::info()).
    if (!OtaApiKeyMiddleware::matches(($version ?? $app->latest)?->api_key, $request->attributes->get('api_key')))
      return $this->apiSingleErrorResponse('api_key', 'Invalid API key', [], 401);

    # A runtime this server does not serve keeps its embedded update.
    if (!$version || !$version->isExpo()) return ExpoUpdateResponse::noUpdate($request);

    $device = $this->device($request);
    $running = $this->runningBundle($request, $version);

    if ($device) {
      $device->apps()->syncWithoutDetaching([
        $app->id => ['version_id' => $version->id, 'bundle_id' => $running?->id],
      ]);
    }

    $target = ReleaseResolver::bundleFor($version, $device, $platform);

    # Nothing to serve: a device running an OTA update goes back to its embedded one
    # (the bundle was withdrawn or deleted, or the device lost demo access).
    if (!$target)
      return $running ? ExpoUpdateResponse::rollBackToEmbedded($request) : ExpoUpdateResponse::noUpdate($request);

    if ($running && $running->id === $target->id)
      return ExpoUpdateResponse::noUpdate($request);

    # expo-updates launches the newest update it has, so an older target cannot
    # simply be served. Roll back to the embedded update first; the next check
    # then moves the device forward to the target.
    if ($running && ReleaseResolver::isNewer($running, $target))
      return ExpoUpdateResponse::rollBackToEmbedded($request);

    return ExpoUpdateResponse::manifest($request, $target, $version, $platform, $device);
  }

  /**
   * Serves one asset. The temporary URL signature (`signed:relative`) is the
   * grant, so no API key or device header is needed — expo-updates does not
   * promise to send custom headers on asset requests.
   */
  public function asset(Request $request, string $package, BundleAsset $asset)
  {
    $bundle = $asset->bundle;
    $version = $bundle?->version;

    if (!$version || $version->app?->package_name !== $package)
      return $this->apiErrorResponse('Not found', [], 404);

    $disk = Storage::disk('public');
    if (!$disk->exists($asset->path))
      return $this->apiErrorResponse('Asset file not found', [], 404);

    if ($asset->is_launch_asset) $this->recordDownload($request, $bundle, $version);

    return response()->file($disk->path($asset->path), [
      'Content-Type'   => $asset->content_type,
      'Content-Length' => $disk->size($asset->path),
      'Cache-Control'  => 'public, max-age=31536000, immutable',
    ]);
  }

  /**
   * The device, from `Expo-Extra-Params` (set by the app with
   * `Updates.setExtraParamAsync`) or `X-Device-Info`. Null for an app that has not
   * reported an id yet: it still gets public updates, never demos.
   */
  private function device(Request $request): ?Device
  {
    $info = [];
    $params = StructuredFields::parseDictionary($request->header('expo-extra-params'));

    foreach (['did', ...array_keys(DeviceRegistry::FIELDS)] as $key) {
      if (isset($params[$key]) && !is_bool($params[$key])) $info[$key] = (string) $params[$key];
    }

    if (empty($info['did'])) $info = DeviceRegistry::parseInfoHeader($request->header('X-Device-Info'));

    if (empty($info['did'])) return null;

    return DeviceRegistry::resolve($info, $request->user());
  }

  /** The OTA bundle the device runs, null when it runs its embedded update. */
  private function runningBundle(Request $request, Version $version): ?Bundle
  {
    $current = strtolower((string) $request->header('expo-current-update-id'));
    $embedded = strtolower((string) $request->header('expo-embedded-update-id'));

    if ($current === '' || $current === $embedded) return null;

    return Bundle::where('version_id', $version->id)->where('expo_update_id', $current)->first();
  }

  private function recordDownload(Request $request, Bundle $bundle, Version $version): void
  {
    $device = $request->query('d') ? Device::find($request->query('d')) : null;

    DownloadHistory::create([
      'device_id'   => $device?->id,
      'user_id'     => $device?->user_id,
      'target_type' => Bundle::class,
      'target_id'   => $bundle->id,
    ]);

    Log::record(
      'bundle.install',
      "Bundle {$bundle->name} downloaded",
      array_values(array_filter([$device, $version->app, $version, $bundle])),
      ['bundle' => $bundle->name, 'client' => 'expo'],
    );
  }
}
