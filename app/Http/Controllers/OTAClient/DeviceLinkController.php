<?php

namespace App\Http\Controllers\OTAClient;

use App\Models\App;
use App\Models\Device;
use App\Models\DeviceLinkCode;
use App\Models\Log;
use App\Services\Releases\DemoAccess;
use App\Src\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * Links the calling device to a user with a one-time code from the dashboard.
 *
 * Behind `ota.api_key` + `device`, like `/app/info`: the body names the
 * `package` and `version`, the device comes from `X-Device-Info`.
 */
class DeviceLinkController extends Controller
{
  /** Who the device is linked to, and whether it receives demo releases of the app. */
  public function info(Request $request)
  {
    [$app, $device] = $this->context($request);

    return $this->apiSuccessResponse('Device link status', [
      'data' => $this->status($device, $app),
    ]);
  }

  public function link(Request $request)
  {
    $validator = Validator::make($request->all(), ['code' => 'required|string|max:32']);

    if ($validator->fails())
      return $this->apiInvalidValuesResponse($validator->errors()->toArray());

    [$app, $device] = $this->context($request);

    $linked = DB::transaction(function () use ($request, $app, $device) {
      $code = DeviceLinkCode::findUsable($request->input('code'), $app);
      if (!$code) return false;

      # Claim the code atomically, so one code links exactly one device.
      $claimed = DeviceLinkCode::whereKey($code->id)->whereNull('used_at')
        ->update(['used_at' => now(), 'device_id' => $device->id]);
      if (!$claimed) return false;

      # A device belongs to one user at a time; relinking replaces the link.
      $device->update(['user_id' => $code->user_id]);

      return true;
    });

    if (!$linked)
      return $this->apiSingleErrorResponse('code', 'Invalid or expired code');

    $device->refresh();

    Log::record(
      'device.linked',
      "Device {$device->did} linked to {$device->user?->name}",
      array_values(array_filter([$device, $device->user, $app])),
    );

    return $this->apiSuccessResponse('Device linked successfully', [
      'data' => $this->status($device, $app),
    ]);
  }

  public function unlink(Request $request)
  {
    [$app, $device] = $this->context($request);

    if ($device->user_id) {
      $user = $device->user;
      $device->update(['user_id' => null]);

      Log::record('device.unlinked', "Device {$device->did} unlinked", array_values(array_filter([$device, $user, $app])));
    }

    return $this->apiSuccessResponse('Device unlinked successfully', [
      'data' => $this->status($device->refresh(), $app),
    ]);
  }

  /** @return array{0: App, 1: Device} */
  private function context(Request $request): array
  {
    # OtaApiKeyMiddleware resolved the app and matched its key; DeviceMiddleware the device.
    $app = App::where('package_name', $request->input('package'))->firstOrFail();
    $device = Device::findOrFail($request->attributes->get('device_id'));

    return [$app, $device];
  }

  private function status(Device $device, App $app): array
  {
    $user = $device->user;

    return [
      'linked'       => $user !== null,
      'user'         => $user ? ['id' => $user->id, 'name' => $user->name] : null,
      'demoEligible' => DemoAccess::allows($device, $app),
    ];
  }
}
