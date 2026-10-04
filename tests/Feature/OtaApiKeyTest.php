<?php

namespace Tests\Feature;

use App\Models\App;
use App\Models\Bundle;
use App\Models\Device;
use App\Models\File;
use App\Models\Version;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * The OTA API is authorized by the version's API key alone — no login session.
 */
class OtaApiKeyTest extends TestCase
{
  private const DEVICE_HEADER = 'did=test-device;mf=Xiaomi;br=Redmi;mdl=M2004J19C;av=12;sdv=31';

  /**
   * @return array{0: App, 1: Version, 2: Bundle}
   */
  private function seedApp(string $apiKey = 'secret-api-key', string $package = 'com.example.ota'): array
  {
    Storage::fake('public');

    $app = App::factory()->create(['package_name' => $package]);

    File::create(['name' => "$package-version", 'disk' => 'public', 'path' => "versions/$package.apk"]);
    Storage::disk('public')->put("versions/$package.apk", 'apk-bytes');

    $version = Version::create([
      'name'      => '1.0.0',
      'changelog' => 'Initial',
      'app_id'    => $app->id,
      'status'    => 'published',
      'api_key'   => $apiKey,
      'file_id'   => "$package-version",
    ]);

    File::create(['name' => "$package-bundle", 'disk' => 'public', 'path' => "bundles/$package.gz"]);
    Storage::disk('public')->put("bundles/$package.gz", 'bundle-bytes');

    $bundle = Bundle::create([
      'version_id' => $version->id,
      'name'       => '1.0.0',
      'file_id'    => "$package-bundle",
    ]);

    return [$app, $version, $bundle];
  }

  private function infoPayload(App $app): array
  {
    return [
      'package' => $app->package_name,
      'version' => '1.0.0',
      'bundle'  => '1.0.0',
    ];
  }

  public function test_update_check_requires_an_api_key(): void
  {
    [$app] = $this->seedApp();

    $response = $this->withHeaders(['X-Device-Info' => self::DEVICE_HEADER])
      ->postJson('/ota-client/v1/app/info', $this->infoPayload($app));

    $response->assertStatus(401)->assertJsonPath('success', false);

    // The key is checked before the device is registered.
    $this->assertDatabaseCount('devices', 0);
  }

  public function test_update_check_rejects_a_wrong_api_key(): void
  {
    [$app] = $this->seedApp();

    $response = $this->withHeaders([
      'X-Device-Info' => self::DEVICE_HEADER,
      'API-KEY'       => 'not-the-key',
    ])->postJson('/ota-client/v1/app/info', $this->infoPayload($app));

    $response->assertStatus(401)->assertJsonPath('success', false);
    $this->assertDatabaseCount('devices', 0);
  }

  public function test_update_check_succeeds_with_the_api_key_and_no_session(): void
  {
    [$app] = $this->seedApp();

    $response = $this->withHeaders([
      'X-Device-Info' => self::DEVICE_HEADER,
      'API-KEY'       => 'secret-api-key',
    ])->postJson('/ota-client/v1/app/info', $this->infoPayload($app));

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('data.appId', $app->id);

    $this->assertDatabaseHas('devices', ['did' => 'test-device']);
  }

  public function test_version_download_is_authorized_by_the_api_key_alone(): void
  {
    [, $version] = $this->seedApp();

    $response = $this->withHeaders([
      'X-Device-Info' => self::DEVICE_HEADER,
      'API-KEY'       => 'secret-api-key',
    ])->get("/ota-client/v1/app/update/version/$version->id");

    $response->assertOk();
    $response->assertHeader('Content-Length', strlen('apk-bytes'));
  }

  public function test_version_download_rejects_a_wrong_api_key(): void
  {
    [, $version] = $this->seedApp();

    $response = $this->withHeaders([
      'X-Device-Info' => self::DEVICE_HEADER,
      'API-KEY'       => 'wrong',
    ])->get("/ota-client/v1/app/update/version/$version->id");

    $response->assertStatus(401);
    $this->assertDatabaseCount('devices', 0);
  }

  public function test_bundle_download_rejects_a_key_from_another_app(): void
  {
    [, , $bundle] = $this->seedApp('key-of-app-a', 'com.example.app-a');
    $this->seedApp('key-of-app-b', 'com.example.app-b');

    $response = $this->withHeaders([
      'X-Device-Info' => self::DEVICE_HEADER,
      'API-KEY'       => 'key-of-app-b',
    ])->get("/ota-client/v1/app/update/bundle/$bundle->id");

    $response->assertStatus(401);
    $this->assertDatabaseCount('download_histories', 0);
  }

  public function test_health_probe_stays_public(): void
  {
    $this->getJson('/ota-client/v1/health')->assertOk()->assertJsonPath('success', true);
    $this->assertNull(Device::first());
  }
}
