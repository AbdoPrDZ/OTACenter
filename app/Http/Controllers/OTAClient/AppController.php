<?php

namespace App\Http\Controllers\OTAClient;

use App\Models\App;
use App\Models\Bundle;
use App\Models\Device;
use App\Models\DownloadHistory;
use App\Models\Log;
use App\Models\User;
use App\Models\Version;
use App\Http\Middleware\OtaApiKeyMiddleware;
use App\Src\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class AppController extends Controller
{
  public function health(Request $request)
  {
    return $this->apiSuccessResponse('OK');
  }

  public function info(Request $request)
  {
    $validator = Validator::make($request->all(), [
      'package' => 'required|string',
      'version' => 'required|string',
      'bundle'  => 'required|string',
    ]);

    if ($validator->fails())
      return $this->apiInvalidValuesResponse($validator->errors()->toArray());

    $app = App::where('package_name', $request->package)->first();
    if (!$app) return $this->apiSingleErrorResponse('package', 'Invalid package name');

    $version = Version::where('app_id', $app->id)->where('name', $request->version)->first();
    if (!$version) return $this->apiSingleErrorResponse('version', 'Invalid version');

    # OtaApiKeyMiddleware already matched the header against this version; this
    # repeats the check so the controller never trusts an unverified request.
    if (!OtaApiKeyMiddleware::matches($version->api_key, $request->attributes->get('api_key')))
      return $this->apiSingleErrorResponse('api_key', 'Invalid API key', [], 401);

    $bundle = Bundle::where('version_id', $version->id)->where('name', $request->bundle)->first();
    if (!$bundle && $version->default_bundle_version !== $request->bundle)
      return $this->apiSingleErrorResponse('bundle', 'Invalid bundle version');

    $device_id = $request->attributes->get('device_id');
    $device = Device::find($device_id);

    if (!$device) throw new \Exception("Device not found for device_id: $device_id");

    # attach device to app with version and bundle
    $device->apps()->syncWithoutDetaching([
      $app->id => [
        'version_id' => $version->id,
        'bundle_id'  => $bundle ? $bundle->id : null,
      ]
    ]);

    $available_version = null;
    if ($app->latest_id && $version->id !== $app->latest_id) {
      $latest = $app->latest;

      if ($latest) {
        $available_version = [
          'id' => $app->latest_id,
          'name' => $latest->name,
          'updateType' => $latest->update_type,
        ];
      }
    }

    $available_bundle = null;
    if (!$available_version && $version->latest_id && $bundle?->id !== $version->latest_id) {
      $latestBundle = $version->latest;

      if ($latestBundle) {
        $available_bundle = [
          'id'   => $version->latest_id,
          'name' => $latestBundle->name,
          'updateType' => $latestBundle->update_type,
        ];
      }
    }

    $session = $device->createToken(
      'OTA Client Session',
      ['app_update'],
      [
        'device_id'  => $device->id,
        'app_id'     => $app->id,
        'version_id' => $version->id,
        'bundle_id'  => $bundle ? $bundle->id : null,
      ]
    )->plainTextToken;

    return $this->apiSuccessResponse("Successfully get device info", [
      'data' => [
        'session' => $session,
        'device_id' => $device->id,
        'appId'     => $app->id,
        'versionId' => $version->id,
        'bundleId'  => $bundle ? $bundle->id : null,
        'availableUpdates' => [
          'version' => $available_version ? $available_version : null,
          'bundle'  => $available_bundle ? $available_bundle : null,
        ],
      ]
    ]);
  }
  /**
   * Records a client-reported event (install, refuse, rollback…). The device is
   * resolved by DeviceMiddleware; the app/version/bundle come from the payload.
   */
  public function event(Request $request)
  {
    $validator = Validator::make($request->all(), [
      'package' => 'required|string',
      'version' => 'required|string',
      'bundle'  => 'nullable|string',
      'event'   => 'required|string|max:255',
      'message' => 'nullable|string|max:1000',
      'meta'    => 'nullable',
    ]);

    if ($validator->fails())
      return $this->apiInvalidValuesResponse($validator->errors()->toArray());

    $event = $request->input('event');

    $allowed = [
      'update.available',
      'update.refused',
      'update.downloaded',
      'update.installed',
      'update.failed',
      'update.rollback',
      'bundle.launch_confirmed',
      'bundle.launch_failed',
    ];

    if (!in_array($event, $allowed, true))
      return $this->apiSingleErrorResponse('event', 'Unsupported event');

    $app = App::where('package_name', $request->package)->first();
    if (!$app) return $this->apiSingleErrorResponse('package', 'Invalid package name');

    $version = Version::where('app_id', $app->id)->where('name', $request->version)->first();
    if (!$version) return $this->apiSingleErrorResponse('version', 'Invalid version');

    if (!OtaApiKeyMiddleware::matches($version->api_key, $request->attributes->get('api_key')))
      return $this->apiSingleErrorResponse('api_key', 'Invalid API key', [], 401);

    $bundle = null;
    if ($request->filled('bundle'))
      $bundle = Bundle::where('version_id', $version->id)->where('name', $request->bundle)->first();

    $device = Device::find($request->attributes->get('device_id'));

    $holders = array_values(array_filter([$device, $app, $version, $bundle]));
    $user = $device?->user_id ? User::find($device->user_id) : null;
    if ($user) $holders[] = $user;

    // The native client sends `meta` as a JSON string (form-encoded request).
    $meta = $request->input('meta');
    if (is_string($meta)) {
      $decoded = json_decode($meta, true);
      $meta = is_array($decoded) ? $decoded : null;
    }

    Log::record($event, $request->input('message'), $holders, $meta);

    return $this->apiSuccessResponse('Event recorded successfully');
  }

  public function updateBundle(Request $request, Bundle $bundle)
  {
    $file = $bundle->file;

    if (!$file) return $this->apiSingleErrorResponse('bundle', 'Bundle file not found');

    $device = Device::find($request->attributes->get('device_id'));
    if (!$device) throw new \Exception("Device not found for device_id: {$request->attributes->get('device_id')}");

    # OtaApiKeyMiddleware already matched the API-KEY to this bundle's version,
    # so the artifact belongs to the caller's app. No session is involved.

    DownloadHistory::create([
      'device_id'   => $device->id,
      'user_id'     => $device->user_id,
      'target_type' => Bundle::class,
      'target_id'   => $bundle->id,
    ]);

    Log::record(
      'bundle.install',
      "Bundle {$bundle->name} downloaded",
      array_values(array_filter([$device, $bundle->version?->app, $bundle->version, $bundle])),
      ['bundle' => $bundle->name],
    );

    return response()->file(Storage::disk('public')->path($file->path), [
      'Content-Length' => Storage::disk('public')->size($file->path),
    ]);
  }

  public function updateVersion(Request $request, Version $version)
  {
    $file = $version->file;

    if (!$file) return $this->apiSingleErrorResponse('version', 'Version file not found');

    $device = Device::find($request->attributes->get('device_id'));
    if (!$device) throw new \Exception("Device not found for device_id: {$request->attributes->get('device_id')}");

    # OtaApiKeyMiddleware already matched the API-KEY to this version, so the
    # artifact belongs to the caller's app. No session is involved.

    DownloadHistory::create([
      'device_id'   => $device->id,
      'user_id'     => $device->user_id,
      'target_type' => Version::class,
      'target_id'   => $version->id,
    ]);

    Log::record(
      'version.install',
      "Version {$version->name} downloaded",
      array_values(array_filter([$device, $version->app, $version])),
      ['version' => $version->name],
    );

    return response()->file(Storage::disk('public')->path($file->path), [
      'Content-Length' => Storage::disk('public')->size($file->path),
    ]);
  }

}
