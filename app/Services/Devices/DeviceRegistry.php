<?php

namespace App\Services\Devices;

use App\Models\Device;
use App\Models\Log;
use App\Models\User;

/**
 * Finds or registers a device from the fingerprint a client reports.
 *
 * Shared by `DeviceMiddleware` (`X-Device-Info` header) and the Expo manifest
 * route (`Expo-Extra-Params` header), so both register devices the same way.
 */
class DeviceRegistry
{
  /** Fingerprint keys → `devices` columns. */
  public const FIELDS = [
    'mf'  => 'manufacturer',
    'br'  => 'brand',
    'mdl' => 'model',
    'av'  => 'android_version',
    'sdv' => 'sdk_version',
  ];

  /**
   * Parses `did=…;mf=…;br=…;mdl=…;av=…;sdv=…`.
   *
   * @return array<string, string>
   */
  public static function parseInfoHeader(?string $header): array
  {
    $info = [];

    foreach (explode(';', (string) $header) as $part) {
      $kv = explode('=', $part, 2);

      if (count($kv) == 2) $info[trim($kv[0])] = trim($kv[1]);
    }

    return $info;
  }

  /**
   * @param array<string, string|null> $info must contain a non-empty `did`
   */
  public static function resolve(array $info, ?User $user = null): Device
  {
    $attributes = ['user_id' => $user?->id];

    foreach (self::FIELDS as $key => $column)
      $attributes[$column] = isset($info[$key]) && $info[$key] !== '' ? (string) $info[$key] : null;

    $device = Device::firstOrCreate(['did' => (string) $info['did']], $attributes);

    if ($device->wasRecentlyCreated) {
      Log::record(
        'device.register',
        "Device {$device->did} registered",
        array_values(array_filter([$device, $user])),
        ['model' => $device->model, 'brand' => $device->brand],
      );
    }

    return $device;
  }
}
