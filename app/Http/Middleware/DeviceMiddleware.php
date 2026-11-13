<?php

namespace App\Http\Middleware;

use App\Services\Devices\DeviceRegistry;
use App\Src\Controller;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;

class DeviceMiddleware
{
  /**
   * Resolves (or registers) the calling device from `X-Device-Info`
   * (`did=8e7ff121ca8656b2;mf=Xiaomi;br=Redmi;mdl=M2004J19C;av=12;sdv=31`), or
   * the `device_id` / `did` query parameter for browser-opened links.
   *
   * @param  Closure(Request): (Response)  $next
   */
  public function handle(Request $request, Closure $next): Response
  {
    $deviceInfo = DeviceRegistry::parseInfoHeader($request->header('X-Device-Info'));

    $deviceInfo['did'] = $deviceInfo['did'] ?? $request->query('device_id') ?? $request->query('did');

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

    $device = DeviceRegistry::resolve($deviceInfo, $request->user());

    $request->attributes->set('device_id', $device->id);

    return $next($request);
  }
}
