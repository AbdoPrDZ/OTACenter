<?php

namespace App\Services\Expo;

use App\Models\Bundle;
use App\Models\BundleAsset;
use App\Models\Version;
use Illuminate\Support\Facades\File as FileSystem;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\Mime\MimeTypes;
use ZipArchive;

/**
 * Turns a zip of `npx expo export` output into a servable Expo update.
 *
 * Expected layout (at the zip root or inside one top-level folder, e.g. `dist/`):
 *
 * ```
 * metadata.json                    fileMetadata.{android,ios}.{bundle, assets[]}
 * expoConfig.json                  optional: `npx expo config --json` (sent as extra.expoClient)
 * _expo/static/js/android/…        launch assets
 * assets/…                         other assets
 * ```
 *
 * Each file is stored once under `bundles/expo/{bundle}/` on the `public` disk
 * and listed in `bundle_assets` per platform with the hashes expo-updates needs.
 */
class ExpoBundleImporter
{
  public const LAUNCH_CONTENT_TYPE = 'application/javascript';

  /** Uncompressed size limit, against zip bombs. */
  public const MAX_UNCOMPRESSED_BYTES = 512 * 1024 * 1024;

  /**
   * @param string|null $runtimeVersion runtime the export was built for; when
   *   null it is read from `expoConfig.json` when possible.
   * @throws ExpoImportException
   */
  public static function import(Bundle $bundle, Version $version, string $zipPath, ?string $runtimeVersion = null): void
  {
    $tmp = storage_path('app/tmp/expo-import-' . Str::random(16));
    $storageDir = "bundles/expo/{$bundle->id}";
    $disk = Storage::disk('public');

    try {
      $root = self::extract($zipPath, $tmp);

      $metadata = self::readJson("$root/metadata.json", 'metadata.json');
      $expoConfig = is_file("$root/expoConfig.json") ? self::readJson("$root/expoConfig.json", 'expoConfig.json') : null;

      $runtime = $runtimeVersion ?: self::runtimeFromConfig($expoConfig);
      if ($runtime !== null && $runtime !== $version->name) {
        throw new ExpoImportException(
          "This export targets runtime \"$runtime\" but the version is \"{$version->name}\". Upload it to the matching version.",
          'runtime_version',
        );
      }

      $fileMetadata = $metadata['fileMetadata'] ?? null;
      if (!is_array($fileMetadata))
        throw new ExpoImportException('metadata.json has no fileMetadata. Is this `npx expo export` output?');

      $platforms = array_values(array_filter(
        BundleAsset::PLATFORMS,
        fn ($platform) => is_string($fileMetadata[$platform]['bundle'] ?? null),
      ));

      if (!$platforms)
        throw new ExpoImportException('The export contains no android or ios bundle.');

      $stored = [];
      $rows = [];

      foreach ($platforms as $platform) {
        $entries = [['path' => $fileMetadata[$platform]['bundle'], 'ext' => null, 'launch' => true]];

        foreach ($fileMetadata[$platform]['assets'] ?? [] as $asset) {
          if (!is_array($asset) || !is_string($asset['path'] ?? null))
            throw new ExpoImportException("metadata.json lists an invalid $platform asset.");

          $entries[] = ['path' => $asset['path'], 'ext' => $asset['ext'] ?? null, 'launch' => false];
        }

        foreach ($entries as $entry) {
          $relative = self::safeRelativePath($entry['path']);
          $source = "$root/$relative";

          if (!is_file($source))
            throw new ExpoImportException("metadata.json lists $relative, which is not in the zip.");

          if (!isset($stored[$relative])) {
            $target = "$storageDir/$relative";
            $stream = fopen($source, 'rb');
            $disk->put($target, $stream);
            if (is_resource($stream)) fclose($stream);

            $stored[$relative] = [
              'path' => $target,
              'key'  => md5_file($source),
              'hash' => self::base64UrlSha256($source),
              'size' => filesize($source),
            ];
          }

          $ext = $entry['ext'] !== null ? ltrim((string) $entry['ext'], '.') : null;

          $rows[] = [
            'bundle_id'       => $bundle->id,
            'platform'        => $platform,
            'source_path'     => $relative,
            ...$stored[$relative],
            'content_type'    => $entry['launch'] ? self::LAUNCH_CONTENT_TYPE : self::contentType($ext),
            'file_extension'  => $entry['launch'] || !$ext ? null : ".$ext",
            'is_launch_asset' => $entry['launch'],
            'created_at'      => now(),
            'updated_at'      => now(),
          ];
        }
      }

      BundleAsset::insert($rows);

      $bundle->update([
        'expo_update_id' => (string) Str::uuid(),
        'expo_metadata'  => [
          'metadata'   => $metadata,
          'expoConfig' => $expoConfig,
          'runtime'    => $runtime ?? $version->name,
        ],
      ]);
    } catch (\Throwable $e) {
      $disk->deleteDirectory($storageDir);
      $bundle->assets()->delete();

      throw $e instanceof ExpoImportException ? $e : new ExpoImportException('Unable to import the Expo export: ' . $e->getMessage());
    } finally {
      FileSystem::deleteDirectory($tmp);
    }
  }

  /** Runtime string from an `npx expo config --json` dump, when it is decidable. */
  public static function runtimeFromConfig(?array $config): ?string
  {
    if (!$config) return null;

    $runtime = $config['runtimeVersion'] ?? null;

    if (is_string($runtime) && $runtime !== '') return $runtime;

    if (is_array($runtime) && ($runtime['policy'] ?? null) === 'appVersion' && is_string($config['version'] ?? null))
      return $config['version'];

    # `nativeVersion` / `fingerprint` policies depend on the platform build: not checkable here.
    return null;
  }

  /** Extracts the zip into `$dir` and returns the folder that holds metadata.json. */
  private static function extract(string $zipPath, string $dir): string
  {
    $zip = new ZipArchive();

    if ($zip->open($zipPath) !== true)
      throw new ExpoImportException('The file is not a valid zip archive. Upload a zip of the `npx expo export` output.');

    try {
      $metadataEntry = null;
      $total = 0;

      for ($i = 0; $i < $zip->numFiles; $i++) {
        $stat = $zip->statIndex($i);
        $name = str_replace('\\', '/', $stat['name']);

        # Zip-slip: never write outside the extraction directory.
        if (str_starts_with($name, '/') || preg_match('#(^|/)\.\.(/|$)#', $name) || preg_match('/^[A-Za-z]:/', $name))
          throw new ExpoImportException("The zip contains an unsafe path: $name");

        $total += $stat['size'];
        if ($total > self::MAX_UNCOMPRESSED_BYTES)
          throw new ExpoImportException('The export is too large once uncompressed.');

        if (basename($name) === 'metadata.json') {
          if ($metadataEntry === null || substr_count($name, '/') < substr_count($metadataEntry, '/'))
            $metadataEntry = $name;
        }
      }

      if ($metadataEntry === null)
        throw new ExpoImportException('metadata.json not found. Upload a zip of the `npx expo export` output.');

      FileSystem::ensureDirectoryExists($dir);

      if (!$zip->extractTo($dir))
        throw new ExpoImportException('Unable to extract the zip archive.');

      $prefix = dirname($metadataEntry);

      return $prefix === '.' ? $dir : "$dir/$prefix";
    } finally {
      $zip->close();
    }
  }

  private static function readJson(string $path, string $label): array
  {
    $data = json_decode((string) file_get_contents($path), true);

    if (!is_array($data))
      throw new ExpoImportException("$label is not valid JSON.");

    return $data;
  }

  private static function safeRelativePath(string $path): string
  {
    $path = ltrim(str_replace('\\', '/', $path), '/');

    if ($path === '' || preg_match('#(^|/)\.\.(/|$)#', $path))
      throw new ExpoImportException("metadata.json lists an unsafe path: $path");

    return $path;
  }

  /** base64url SHA-256 without padding, as expo-updates verifies it. */
  public static function base64UrlSha256(string $file): string
  {
    return rtrim(strtr(base64_encode(hash_file('sha256', $file, true)), '+/', '-_'), '=');
  }

  private static function contentType(?string $ext): string
  {
    if (!$ext) return 'application/octet-stream';

    return MimeTypes::getDefault()->getMimeTypes(strtolower($ext))[0] ?? 'application/octet-stream';
  }
}
