<?php

namespace App\Http\Middleware;

use App\Models\Device;
use App\Src\Controller;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;

class DeviceMiddleware
{
  /**
   * Handle an incoming request.
   *
   * @param  Closure(Request): (Response)  $next
   */
  public function handle(Request $request, Closure $next): Response
  {
    # get X-Device-Id header
    $deviceInfoStr = $request->header('X-Device-Info');

    $parts = explode(';', $deviceInfoStr);

    $deviceInfo = [];

    foreach ($parts as $part) {
      $kv = explode('=', $part);

      if (count($kv) == 2) $deviceInfo[trim($kv[0])] = trim($kv[1]);
    }

    $deviceInfo['did'] = $deviceInfo['did'] ?? $request->query('device_id') ?? $request->query('did');

    # did=8e7ff121ca8656b2;mf=Xiaomi;br=Redmi;mdl=M2004J19C;av=12;sdv=31
    $validator = Validator::make($deviceInfo, [
      'did' => 'required|string', # Device ID
      'mf'  => 'nullable|string', # Manufacturer
      'br'  => 'nullable|string', # Brand
      'mdl' => 'nullable|string', # Model
      'av'  => 'nullable|string', # Android version
      'sdv' => 'nullable|string', # SDK version
    ]);

    if ($validator->fails())
      return Controller::apiInvalidValuesResponse($validator->errors()->toArray());

    $user = $request->user();

    $device = Device::firstOrCreate(
      ['did' => $deviceInfo['did']],
      [
        'user_id'         => $user ? $user->id : null,
        'manufacturer'    => $deviceInfo['mf']  ?? null,
        'brand'           => $deviceInfo['br']  ?? null,
        'model'           => $deviceInfo['mdl'] ?? null,
        'android_version' => $deviceInfo['av']  ?? null,
        'sdk_version'     => $deviceInfo['sdv'] ?? null,
      ]
    );

    $request->attributes->set('device_id', $device->id);

    return $next($request);
  }
}
