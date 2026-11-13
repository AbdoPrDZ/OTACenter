<?php

namespace Tests\Feature;

use App\Models\App;
use App\Models\Bundle;
use App\Models\BundleAsset;
use App\Models\Version;
use App\Services\Expo\ExpoBundleImporter;
use App\Services\Expo\StructuredFields;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;
use ZipArchive;

/**
 * Expo Updates protocol v1: upload of `npx expo export` output, manifest
 * negotiation, signed asset URLs, rollback and code signing.
 */
class ExpoUpdatesTest extends TestCase
{
  private const KEY = 'expo-api-key';
  private const PACKAGE = 'com.example.expo';

  private const ANDROID_BUNDLE = 'android-bundle-bytes';
  private const IOS_BUNDLE = 'ios-bundle-bytes';
  private const IMAGE = 'png-bytes';

  /** @var list<string> */
  private array $tempFiles = [];

  protected function tearDown(): void
  {
    foreach ($this->tempFiles as $file) @unlink($file);

    parent::tearDown();
  }

  /* ------------------------------ fixtures ----------------------------- */

  /**
   * A zip shaped like `npx expo export` output (inside a `dist/` folder).
   *
   * @param array<string, string> $extra additional zip entries
   */
  private function exportZip(
    array $platforms = ['android', 'ios'],
    ?string $runtime = '1.0.0',
    array $extra = [],
    ?array $metadata = null,
  ): UploadedFile {
    $files = [];
    $fileMetadata = [];

    foreach ($platforms as $platform) {
      $bundlePath = "_expo/static/js/$platform/index-$platform.hbc";
      $files[$bundlePath] = $platform === 'android' ? self::ANDROID_BUNDLE : self::IOS_BUNDLE;
      $fileMetadata[$platform] = [
        'bundle' => $bundlePath,
        'assets' => [['path' => 'assets/0123abcd', 'ext' => 'png']],
      ];
    }

    $files['assets/0123abcd'] = self::IMAGE;
    $files['metadata.json'] = json_encode($metadata ?? ['version' => 0, 'bundler' => 'metro', 'fileMetadata' => $fileMetadata]);

    if ($runtime !== null)
      $files['expoConfig.json'] = json_encode(['name' => 'Expo app', 'slug' => 'expo-app', 'version' => '1.0.0', 'runtimeVersion' => $runtime]);

    $path = tempnam(sys_get_temp_dir(), 'expo-export-') . '.zip';
    $this->tempFiles[] = $path;

    $zip = new ZipArchive();
    $zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE);
    foreach ($files as $name => $content) $zip->addFromString("dist/$name", $content);
    foreach ($extra as $name => $content) $zip->addFromString($name, $content);
    $zip->close();

    return new UploadedFile($path, 'export.zip', 'application/zip', null, true);
  }

  /** @return array{0: App, 1: Version} */
  private function expoApp(): array
  {
    Storage::fake('public');

    $app = App::factory()->create(['package_name' => self::PACKAGE]);

    $version = Version::create([
      'app_id'      => $app->id,
      'name'        => '1.0.0',
      'client_type' => Version::CLIENT_EXPO,
      'changelog'   => 'Initial',
      'status'      => 'published',
      'api_key'     => self::KEY,
    ]);

    $app->update(['latest_id' => $version->id]);

    return [$app, $version];
  }

  private function upload(App $app, Version $version, UploadedFile $zip, array $fields = []): TestResponse
  {
    return $this->withHeaders($this->authHeaders())->post(
      "/api/app/$app->id/version/$version->id/bundle",
      ['name' => $fields['name'] ?? '1.0.1', 'file' => $zip, ...$fields],
      ['Accept' => 'application/json'],
    );
  }

  private function publishedBundle(App $app, Version $version, string $name = '1.0.1', array $platforms = ['android', 'ios']): Bundle
  {
    $this->upload($app, $version, $this->exportZip($platforms), ['name' => $name])->assertOk();

    $bundle = Bundle::where('version_id', $version->id)->where('name', $name)->firstOrFail();
    $version->update(['latest_id' => $bundle->id]);

    return $bundle;
  }

  private function manifest(array $headers = []): TestResponse
  {
    $this->flushHeaders();

    return $this->withHeaders([
      'expo-protocol-version' => '1',
      'expo-platform'         => 'android',
      'expo-runtime-version'  => '1.0.0',
      'API-KEY'               => self::KEY,
      ...$headers,
    ])->get('/ota-client/v1/expo/' . self::PACKAGE . '/manifest');
  }

  /**
   * Splits a multipart/mixed response into `name => [headers, body]`.
   *
   * @return array<string, array{headers: array<string, string>, body: string}>
   */
  private function parts(TestResponse $response): array
  {
    $this->assertMatchesRegularExpression('/^multipart\/mixed; boundary=/', $response->headers->get('Content-Type'));
    $boundary = explode('boundary=', $response->headers->get('Content-Type'))[1];

    $parts = [];
    foreach (explode("--$boundary", $response->getContent()) as $chunk) {
      $chunk = trim($chunk, "\r\n");
      if ($chunk === '' || $chunk === '--') continue;

      [$rawHeaders, $body] = explode("\r\n\r\n", $chunk, 2);
      $headers = [];
      foreach (explode("\r\n", $rawHeaders) as $line) {
        [$key, $value] = explode(':', $line, 2);
        $headers[strtolower(trim($key))] = trim($value);
      }

      preg_match('/name="([^"]+)"/', $headers['content-disposition'], $m);
      $parts[$m[1]] = ['headers' => $headers, 'body' => $body];
    }

    return $parts;
  }

  private function manifestJson(TestResponse $response): array
  {
    $parts = $this->parts($response);
    $this->assertArrayHasKey('manifest', $parts);

    return json_decode($parts['manifest']['body'], true);
  }

  private function directive(TestResponse $response): ?string
  {
    $parts = $this->parts($response);

    return isset($parts['directive']) ? json_decode($parts['directive']['body'], true)['type'] : null;
  }

  /* ------------------------------- upload ------------------------------ */

  public function test_an_export_upload_lists_every_file_per_platform_with_its_hashes(): void
  {
    [$app, $version] = $this->expoApp();

    $this->upload($app, $version, $this->exportZip())->assertOk()
      ->assertJsonPath('item.platforms', ['android', 'ios']);

    $bundle = Bundle::firstOrFail();
    $this->assertNotNull($bundle->expo_update_id);
    $this->assertSame(4, $bundle->assets()->count());

    $launch = $bundle->assets()->where('platform', 'android')->where('is_launch_asset', true)->firstOrFail();
    $this->assertSame('application/javascript', $launch->content_type);
    $this->assertSame(md5(self::ANDROID_BUNDLE), $launch->key);
    $this->assertSame(rtrim(strtr(base64_encode(hash('sha256', self::ANDROID_BUNDLE, true)), '+/', '-_'), '='), $launch->hash);
    Storage::disk('public')->assertExists($launch->path);

    $image = $bundle->assets()->where('platform', 'ios')->where('is_launch_asset', false)->firstOrFail();
    $this->assertSame('image/png', $image->content_type);
    $this->assertSame('.png', $image->file_extension);
  }

  public function test_an_upload_built_for_another_runtime_is_rejected(): void
  {
    [$app, $version] = $this->expoApp();

    $this->upload($app, $version, $this->exportZip(runtime: '2.0.0'))
      ->assertStatus(422)
      ->assertJsonPath('success', false);

    $this->assertDatabaseCount('bundles', 0);
    $this->assertDatabaseCount('bundle_assets', 0);
  }

  public function test_an_upload_with_a_path_escaping_the_archive_is_rejected(): void
  {
    [$app, $version] = $this->expoApp();

    $this->upload($app, $version, $this->exportZip(extra: ['../evil.txt' => 'x']))->assertStatus(422);

    $this->assertDatabaseCount('bundles', 0);
  }

  public function test_an_upload_without_metadata_is_rejected(): void
  {
    [$app, $version] = $this->expoApp();

    $this->upload($app, $version, $this->exportZip(metadata: ['nothing' => true]))->assertStatus(422);

    $this->assertDatabaseCount('bundles', 0);
  }

  public function test_a_non_zip_upload_to_an_expo_version_is_rejected(): void
  {
    [$app, $version] = $this->expoApp();

    $tar = UploadedFile::fake()->create('bundle.tar.gz', 10);

    $this->upload($app, $version, $tar)->assertStatus(400)->assertJsonPath('success', false);
    $this->assertDatabaseCount('bundles', 0);
  }

  /* ------------------------------ manifest ----------------------------- */

  public function test_the_manifest_describes_the_published_bundle_for_the_platform(): void
  {
    [$app, $version] = $this->expoApp();
    $bundle = $this->publishedBundle($app, $version);

    $response = $this->manifest()->assertOk()
      ->assertHeader('expo-protocol-version', '1')
      ->assertHeader('expo-sfv-version', '0');

    $manifest = $this->manifestJson($response);

    $this->assertSame($bundle->expo_update_id, $manifest['id']);
    $this->assertSame('1.0.0', $manifest['runtimeVersion']);
    $this->assertSame('application/javascript', $manifest['launchAsset']['contentType']);
    $this->assertArrayNotHasKey('fileExtension', $manifest['launchAsset']);
    $this->assertCount(1, $manifest['assets']);
    $this->assertSame('.png', $manifest['assets'][0]['fileExtension']);
    $this->assertSame('1.0.1', $manifest['extra']['otaCenter']['bundleName']);
    $this->assertFalse($manifest['extra']['otaCenter']['demo']);
    $this->assertSame('expo-app', $manifest['extra']['expoClient']['slug']);
  }

  public function test_assets_download_through_their_signed_url_and_match_the_hash(): void
  {
    [$app, $version] = $this->expoApp();
    $this->publishedBundle($app, $version);

    $manifest = $this->manifestJson($this->manifest(['expo-extra-params' => 'did="expo-device"']));

    $this->flushHeaders();
    $response = $this->get($manifest['launchAsset']['url'])->assertOk()
      ->assertHeader('Content-Type', 'application/javascript');

    $content = $response->streamedContent();
    $this->assertSame(self::ANDROID_BUNDLE, $content);
    $this->assertSame(
      $manifest['launchAsset']['hash'],
      rtrim(strtr(base64_encode(hash('sha256', $content, true)), '+/', '-_'), '='),
    );

    # The launch-asset download is counted for the device.
    $this->assertDatabaseHas('download_histories', ['target_type' => Bundle::class]);
  }

  public function test_an_asset_url_with_a_tampered_signature_is_refused(): void
  {
    [$app, $version] = $this->expoApp();
    $this->publishedBundle($app, $version);

    $url = $this->manifestJson($this->manifest())['launchAsset']['url'];
    $other = BundleAsset::where('is_launch_asset', true)->where('platform', 'ios')->firstOrFail();

    $this->flushHeaders();
    $this->get(preg_replace('#/assets/\d+#', "/assets/$other->id", $url))->assertForbidden();
  }

  public function test_the_ios_manifest_serves_the_ios_launch_asset(): void
  {
    [$app, $version] = $this->expoApp();
    $this->publishedBundle($app, $version);

    $manifest = $this->manifestJson($this->manifest(['expo-platform' => 'ios']));

    $this->flushHeaders();
    $this->assertSame(self::IOS_BUNDLE, $this->get($manifest['launchAsset']['url'])->streamedContent());
  }

  public function test_a_platform_the_bundle_does_not_ship_gets_no_update(): void
  {
    [$app, $version] = $this->expoApp();
    $this->publishedBundle($app, $version, platforms: ['android']);

    $this->assertSame('noUpdateAvailable', $this->directive($this->manifest(['expo-platform' => 'ios'])));
  }

  public function test_a_device_already_running_the_bundle_gets_no_update(): void
  {
    [$app, $version] = $this->expoApp();
    $bundle = $this->publishedBundle($app, $version);

    $response = $this->manifest(['expo-current-update-id' => strtoupper($bundle->expo_update_id)]);

    $this->assertSame('noUpdateAvailable', $this->directive($response));
  }

  public function test_without_a_published_bundle_the_embedded_update_stays(): void
  {
    $this->expoApp();

    $this->assertSame('noUpdateAvailable', $this->directive($this->manifest()));
  }

  public function test_an_unlisted_runtime_gets_no_update(): void
  {
    [$app, $version] = $this->expoApp();
    $this->publishedBundle($app, $version);

    $this->assertSame('noUpdateAvailable', $this->directive($this->manifest(['expo-runtime-version' => '9.9.9'])));
  }

  public function test_a_withdrawn_bundle_rolls_the_device_back_to_its_embedded_update(): void
  {
    [$app, $version] = $this->expoApp();
    $bundle = $this->publishedBundle($app, $version);
    $version->update(['latest_id' => null]);

    $response = $this->manifest([
      'expo-current-update-id'  => $bundle->expo_update_id,
      'expo-embedded-update-id' => '00000000-0000-0000-0000-000000000000',
    ]);

    $parts = $this->parts($response);
    $directive = json_decode($parts['directive']['body'], true);
    $this->assertSame('rollBackToEmbedded', $directive['type']);
    $this->assertArrayHasKey('commitTime', $directive['parameters']);
  }

  public function test_moving_a_device_to_an_older_bundle_goes_through_the_embedded_update(): void
  {
    [$app, $version] = $this->expoApp();
    $old = $this->publishedBundle($app, $version, '1.0.1');
    $new = $this->publishedBundle($app, $version, '1.0.2');
    $old->forceFill(['created_at' => now()->subDay()])->save();

    # Public pointer moved back to the older bundle while the device runs the newer one.
    $version->update(['latest_id' => $old->id]);

    $this->assertSame('rollBackToEmbedded', $this->directive($this->manifest(['expo-current-update-id' => $new->expo_update_id])));

    # Once on the embedded update, the device is served the older bundle.
    $this->assertSame($old->expo_update_id, $this->manifestJson($this->manifest())['id']);
  }

  /* ---------------------------- validation ----------------------------- */

  public function test_the_manifest_requires_the_api_key(): void
  {
    [$app, $version] = $this->expoApp();
    $this->publishedBundle($app, $version);

    $this->manifest(['API-KEY' => 'wrong'])->assertStatus(401);
  }

  public function test_an_unknown_package_is_not_found(): void
  {
    $this->expoApp();

    $this->flushHeaders();
    $this->withHeaders([
      'expo-protocol-version' => '1',
      'expo-platform'         => 'android',
      'expo-runtime-version'  => '1.0.0',
      'API-KEY'               => self::KEY,
    ])->get('/ota-client/v1/expo/com.unknown.app/manifest')->assertNotFound();
  }

  public function test_other_protocol_versions_and_platforms_are_refused(): void
  {
    [$app, $version] = $this->expoApp();
    $this->publishedBundle($app, $version);

    $this->manifest(['expo-protocol-version' => '0'])->assertStatus(406);
    $this->manifest(['expo-platform' => 'web'])->assertStatus(400);
  }

  public function test_the_device_is_registered_from_the_extra_params(): void
  {
    [$app, $version] = $this->expoApp();
    $this->publishedBundle($app, $version);

    $this->manifest(['expo-extra-params' => 'did="expo-1", mf="Google", mdl="Pixel 9"'])->assertOk();

    $this->assertDatabaseHas('devices', ['did' => 'expo-1', 'manufacturer' => 'Google', 'model' => 'Pixel 9']);
    $this->assertDatabaseHas('device_apps', ['app_id' => $app->id, 'version_id' => $version->id]);
  }

  public function test_an_ota_client_version_does_not_answer_expo_requests(): void
  {
    [$app, $version] = $this->expoApp();
    $this->publishedBundle($app, $version);
    $version->update(['client_type' => Version::CLIENT_OTA]);

    $this->assertSame('noUpdateAvailable', $this->directive($this->manifest()));
  }

  public function test_app_info_accepts_an_expo_app_running_its_embedded_update(): void
  {
    [$app, $version] = $this->expoApp();
    $this->publishedBundle($app, $version);

    $this->flushHeaders();
    $this->withHeaders(['X-Device-Info' => 'did=expo-info', 'API-KEY' => self::KEY])
      ->postJson('/ota-client/v1/app/info', ['package' => self::PACKAGE, 'version' => '1.0.0', 'bundle' => 'embedded'])
      ->assertOk()
      ->assertJsonPath('data.availableUpdates.version', null);
  }

  public function test_the_files_of_an_expo_bundle_cannot_be_replaced(): void
  {
    [$app, $version] = $this->expoApp();
    $bundle = $this->publishedBundle($app, $version);

    $this->flushHeaders();
    $this->withHeaders($this->authHeaders())->post(
      "/api/app/$app->id/version/$version->id/bundle/$bundle->id",
      ['_method' => 'PUT', 'file' => $this->exportZip()],
      ['Accept' => 'application/json'],
    )->assertStatus(400);

    $this->assertSame(4, $bundle->assets()->count());
  }

  /* ---------------------------- code signing --------------------------- */

  public function test_manifests_are_signed_when_the_app_expects_it(): void
  {
    # A minimal config, for PHP builds that ship no openssl.cnf (Windows).
    $cnf = tempnam(sys_get_temp_dir(), 'openssl-cnf-');
    $this->tempFiles[] = $cnf;
    file_put_contents($cnf, "[ req ]\ndistinguished_name = req_dn\n[ req_dn ]\n");
    $options = ['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA, 'config' => $cnf];

    $key = openssl_pkey_new($options);
    openssl_pkey_export($key, $pem, null, $options);
    $path = tempnam(sys_get_temp_dir(), 'expo-key-');
    $this->tempFiles[] = $path;
    file_put_contents($path, $pem);
    config(['ota.expo.signing_key' => $path]);

    [$app, $version] = $this->expoApp();
    $this->publishedBundle($app, $version);

    $part = $this->parts($this->manifest(['expo-expect-signature' => 'sig, keyid="main", alg="rsa-v1_5-sha256"']))['manifest'];

    $signature = StructuredFields::parseDictionary($part['headers']['expo-signature']);
    $this->assertSame('main', $signature['keyid']);

    $public = openssl_pkey_get_details($key)['key'];
    $this->assertSame(1, openssl_verify($part['body'], base64_decode($signature['sig']), $public, OPENSSL_ALGO_SHA256));
  }

  public function test_a_signature_request_without_a_configured_key_is_refused(): void
  {
    config(['ota.expo.signing_key' => null]);

    [$app, $version] = $this->expoApp();
    $this->publishedBundle($app, $version);

    $this->manifest(['expo-expect-signature' => 'sig'])->assertStatus(400);
  }

  /* ------------------------------- helpers ----------------------------- */

  public function test_structured_field_dictionaries_round_trip(): void
  {
    $parsed = StructuredFields::parseDictionary('did="a\"b", n=42, flag, off=?0, tok=abc;p=1');

    $this->assertSame(['did' => 'a"b', 'n' => 42, 'flag' => true, 'off' => false, 'tok' => 'abc'], $parsed);
    $this->assertSame('did="a\"b", n=42', StructuredFields::serializeDictionary(['did' => 'a"b', 'n' => 42]));
  }

  public function test_the_runtime_is_read_from_an_app_version_policy(): void
  {
    $this->assertSame('2.1.0', ExpoBundleImporter::runtimeFromConfig(['version' => '2.1.0', 'runtimeVersion' => ['policy' => 'appVersion']]));
    $this->assertNull(ExpoBundleImporter::runtimeFromConfig(['runtimeVersion' => ['policy' => 'fingerprint']]));
  }
}
