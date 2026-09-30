<?php

namespace App\Http\Controllers\OTAClient;

use App\Models\App;
use App\Models\Bundle;
use App\Models\Device;
use App\Models\DownloadHistory;
use App\Models\Version;
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

    // $berarToken = $request->bearerToken();

    // $token = str_contains($berarToken, '|') ? explode('|', $berarToken)[1] : null;
    // if (!$token) throw new \Exception("Token not found in request");

    // \Log::info("Request token: $token, Device Tokens: " . json_encode($device->tokens()));
    // $token = $device->tokens()->where('token', hash('sha256', $token))->first();
    // if (!$token) throw new \Exception("Token not found for device_id: {$device->id} and token: $token");

    $token = $request->attributes->get('token');
    if (!$token) throw new \Exception("Token not found in request attributes");

    if ($token->data['device_id'] != $device->id)
      return $this->apiSingleErrorResponse('token', 'Token does not belong to the device');

    $version_id = $token->data['version_id'] ?? null;
    if (!$version_id || $version_id != $bundle->version_id) {
      return $this->apiSingleErrorResponse('bundle', 'Bundle does not belong to the version associated with the device');
    }

    $app_id = $token->data['app_id'] ?? null;
    if (!$app_id || $app_id != $bundle->version->app_id) {
      return $this->apiSingleErrorResponse('bundle', 'Bundle does not belong to the app associated with the device');
    }

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
    // \Log::info("App: $version->app_id, Version: $version->id, Latest Version: {$version->app->latest_id}, Version Default Bundle: $version->default_bundle_version, Request Bundle: $request->bundle");
    $file = $version->file;

    if (!$file) return $this->apiSingleErrorResponse('version', 'Version file not found');

    $device = Device::find($request->attributes->get('device_id'));
    if (!$device) throw new \Exception("Device not found for device_id: {$request->attributes->get('device_id')}");

    // $berarToken = $request->bearerToken();

    // \Log::info("Request token: $berarToken, Device Tokens: " . json_encode($device->tokens()));

    // $token = str_contains($berarToken, '|') ? explode('|', $berarToken)[1] : null;
    // if (!$token) throw new \Exception("Token not found in request");

    // \Log::info("Request token: $token, Device Tokens: " . json_encode($device->tokens()));
    // $token = $device->tokens()->where('token', hash('sha256', $token))->first();
    // // if (!$token) throw new \Exception("Token not found for device_id: {$device->id} and token: $token");
    // if (!$token) return $this->apiSingleErrorResponse('token', 'Token not found for device');

    \Log::info("Request attributes: " . json_encode($request->attributes));
    $token = $request->attributes->get('token');
    if (!$token) throw new \Exception("Token not found in request attributes");

    if ($token->data['device_id'] != $device->id)
      return $this->apiSingleErrorResponse('token', 'Token does not belong to the device');

    $app_id = $token->data['app_id'] ?? null;
    if (!$app_id || $app_id != $version->app_id) {
      return $this->apiSingleErrorResponse('version', 'Version does not belong to the app associated with the device');
    }

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
