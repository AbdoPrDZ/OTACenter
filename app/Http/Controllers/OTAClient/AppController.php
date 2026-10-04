<?php

namespace App\Http\Controllers\OTAClient;

use App\Models\App;
use App\Models\Bundle;
use App\Models\Device;
use App\Models\DownloadHistory;
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

    return response()->file(Storage::disk('public')->path($file->path), [
      'Content-Length' => Storage::disk('public')->size($file->path),
    ]);
  }

}
