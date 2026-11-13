<?php

namespace App\Http\Controllers;

use App\Models\App;
use App\Models\Device;
use App\Models\DeviceLinkCode;
use App\Models\Log;
use App\Models\User;
use App\Src\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

/**
 * One-time codes that link a device to a user (for demo releases), and the
 * devices linked to a user.
 *
 * A code only matters for users in a domain with `allow_demo`, so anyone may
 * create one for themselves; creating one for someone else needs `device.link`.
 */
class DeviceLinkCodeController extends Controller
{
  /** `POST /api/auth/device-link-code` — a code for the signed-in user. */
  public function storeForSelf(Request $request)
  {
    return $this->issue($request, Auth::user());
  }

  /** `POST /api/user/{user}/device-link-code` — a code for another user. */
  public function storeForUser(Request $request, User $user)
  {
    return $this->issue($request, $user);
  }

  /** `GET /api/user/{user}/device` — devices linked to the user. */
  public function devices(User $user)
  {
    $devices = Device::where('user_id', $user->id)->orderByDesc('updated_at')->get();

    return $this->apiSuccessResponse('Devices retrieved successfully', [
      'items' => $devices->map(fn (Device $device) => [
        'id'           => $device->id,
        'did'          => $device->did,
        'manufacturer' => $device->manufacturer,
        'brand'        => $device->brand,
        'model'        => $device->model,
        'created_at'   => $device->created_at,
        'updated_at'   => $device->updated_at,
      ])->all(),
    ]);
  }

  /** `DELETE /api/device/{device}/link` — unlink a device from its user. */
  public function unlink(Device $device)
  {
    $user = $device->user;

    if ($user) {
      $device->update(['user_id' => null]);

      Log::record('device.unlinked', "Device {$device->did} unlinked", array_values(array_filter([$device, $user, Auth::user()])));
    }

    return $this->apiSuccessResponse('Device unlinked successfully');
  }

  private function issue(Request $request, User $user)
  {
    $validator = Validator::make($request->all(), [
      'app_id'             => 'nullable|integer|exists:apps,id',
      'expires_in_minutes' => 'nullable|integer|min:1|max:' . DeviceLinkCode::MAX_TTL_MINUTES,
    ]);

    if ($validator->fails())
      return $this->apiInvalidValuesResponse($validator->errors()->toArray());

    $app = $request->filled('app_id') ? App::find($request->input('app_id')) : null;
    $ttl = (int) ($request->input('expires_in_minutes') ?: DeviceLinkCode::DEFAULT_TTL_MINUTES);

    [$record, $code] = DeviceLinkCode::issue($user, $app, Auth::user(), $ttl);

    Log::record(
      'device.link_code_created',
      "Device link code created for {$user->name}",
      array_values(array_filter([$user, $app, Auth::user()])),
    );

    return $this->apiSuccessResponse('Device link code created', [
      'item' => [
        ...$record->toArray(),
        # Shown once: only its hash is stored.
        'code' => $code,
      ],
    ]);
  }
}
