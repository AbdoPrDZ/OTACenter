<?php

namespace App\Services\Expo;

use App\Models\Bundle;
use App\Models\BundleAsset;
use App\Models\Device;
use App\Models\Version;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

/**
 * Builds Expo Updates protocol v1 responses (multipart/mixed).
 *
 * @see https://docs.expo.dev/technical-specs/expo-updates-1/
 */
class ExpoUpdateResponse
{
  public const PROTOCOL_VERSION = '1';

  /** Thrown when the app asks for a signature the server cannot produce. */
  public const SIGNING_UNAVAILABLE = 'Code signing was requested but OTA_EXPO_SIGNING_KEY is not configured.';

  public static function manifest(Request $request, Bundle $bundle, Version $version, string $platform, ?Device $device): Response
  {
    $assets = $bundle->assets()->where('platform', $platform)->orderBy('id')->get();
    $launch = $assets->firstWhere('is_launch_asset', true);

    $describe = function (BundleAsset $asset, bool $isLaunch) use ($request, $version, $device): array {
      $entry = [
        'hash'        => $asset->hash,
        'key'         => $asset->key,
        'contentType' => $asset->content_type,
        'url'         => self::assetUrl($request, $version, $asset, $device),
      ];

      if (!$isLaunch && $asset->file_extension) $entry['fileExtension'] = $asset->file_extension;

      return $entry;
    };

    $expoConfig = $bundle->expo_metadata['expoConfig'] ?? null;

    $manifest = [
      'id'             => $bundle->expo_update_id,
      'createdAt'      => $bundle->created_at->copy()->utc()->format('Y-m-d\TH:i:s.v\Z'),
      'runtimeVersion' => $version->name,
      'launchAsset'    => $describe($launch, true),
      'assets'         => $assets->where('is_launch_asset', false)->values()
        ->map(fn (BundleAsset $asset) => $describe($asset, false))->all(),
      'metadata'       => new \stdClass(),
      'extra'          => array_filter([
        # Constants.expoConfig inside the updated app is read from here.
        'expoClient' => $expoConfig,
        'otaCenter'  => [
          'bundleId'   => $bundle->id,
          'bundleName' => $bundle->name,
          'updateType' => $bundle->update_type ?? 'optional',
          'changelog'  => $bundle->changelog,
          'demo'       => (bool) $bundle->is_demo,
        ],
      ], fn ($value) => $value !== null),
    ];

    return self::multipart($request, [
      ['name' => 'manifest', 'body' => self::json($manifest)],
    ]);
  }

  public static function noUpdate(Request $request): Response
  {
    return self::multipart($request, [
      ['name' => 'directive', 'body' => self::json(['type' => 'noUpdateAvailable'])],
    ]);
  }

  /** Sends the device back to the update embedded in its binary. */
  public static function rollBackToEmbedded(Request $request): Response
  {
    return self::multipart($request, [
      ['name' => 'directive', 'body' => self::json([
        'type'       => 'rollBackToEmbedded',
        'parameters' => ['commitTime' => now()->utc()->format('Y-m-d\TH:i:s.v\Z')],
      ])],
    ]);
  }

  /**
   * Signed, expiring asset URL. The signature is the grant: the asset route
   * needs no API key, and only devices that were sent this manifest (demo
   * eligibility included) ever hold a valid URL.
   */
  public static function assetUrl(Request $request, Version $version, BundleAsset $asset, ?Device $device): string
  {
    $path = URL::temporarySignedRoute(
      'ota.expo.asset',
      now()->addMinutes(config('ota.expo.asset_url_ttl', 1440)),
      array_filter([
        'package' => $version->app->package_name,
        'asset'   => $asset->id,
        'd'       => $device?->id,
      ], fn ($value) => $value !== null),
      absolute: false,
    );

    return $request->getSchemeAndHttpHost() . $path;
  }

  /** @param list<array{name: string, body: string}> $parts */
  private static function multipart(Request $request, array $parts): Response
  {
    $sign = $request->hasHeader('expo-expect-signature');
    $key = $sign ? self::signingKey() : null;

    # The controller rejects such requests first (see canSign()); this is a safety net.
    if ($sign && !$key)
      throw new \RuntimeException(self::SIGNING_UNAVAILABLE);

    $boundary = 'ota-' . Str::random(24);
    $body = '';

    foreach ($parts as $part) {
      $body .= "--$boundary\r\n";
      $body .= "Content-Disposition: form-data; name=\"{$part['name']}\"\r\n";
      $body .= "Content-Type: application/json; charset=utf-8\r\n";

      if ($key) $body .= 'expo-signature: ' . self::signature($part['body'], $key) . "\r\n";

      $body .= "\r\n{$part['body']}\r\n";
    }

    $body .= "--$boundary--\r\n";

    return new Response($body, 200, [
      'Content-Type'          => "multipart/mixed; boundary=$boundary",
      'expo-protocol-version' => self::PROTOCOL_VERSION,
      'expo-sfv-version'      => '0',
      'Cache-Control'         => 'private, max-age=0',
    ]);
  }

  private static function json(array $data): string
  {
    return json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
  }

  private static function signature(string $body, \OpenSSLAsymmetricKey $key): string
  {
    if (!openssl_sign($body, $signature, $key, OPENSSL_ALGO_SHA256))
      throw new \RuntimeException('Unable to sign the Expo update response.');

    return StructuredFields::serializeDictionary([
      'sig'   => base64_encode($signature),
      'keyid' => (string) config('ota.expo.signing_key_id', 'main'),
      'alg'   => 'rsa-v1_5-sha256',
    ]);
  }

  public static function canSign(): bool
  {
    return self::signingKey() !== null;
  }

  private static function signingKey(): ?\OpenSSLAsymmetricKey
  {
    $path = config('ota.expo.signing_key');

    if (!$path || !is_file($path)) return null;

    return openssl_pkey_get_private((string) file_get_contents($path)) ?: null;
  }
}
