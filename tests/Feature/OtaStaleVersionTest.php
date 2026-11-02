<?php

namespace Tests\Feature;

use App\Models\App;
use App\Models\Bundle;
use App\Models\File;
use App\Models\Version;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * A device can report an installed version the dashboard no longer lists (an old
 * APK, or a build that was never published here). The update check must still
 * answer with the current version instead of `400 "Invalid version"`, and must
 * authorize the caller with the current version's API key.
 */
class OtaStaleVersionTest extends TestCase
{
  private const DEVICE_HEADER = 'did=stale-device;mf=Xiaomi;br=Redmi;mdl=M2004J19C;av=12;sdv=31';

  private function makeFile(string $name, string $path): File
  {
    Storage::disk('public')->put($path, 'bytes');

    return File::create(['name' => $name, 'disk' => 'public', 'path' => $path]);
  }

  /**
   * The app's current version, with the bundle embedded in its APK.
   *
   * @return array{0: App, 1: Version}
   */
  private function appWithCurrentVersion(string $package = 'com.example.stale'): array
  {
    Storage::fake('public');

    $app = App::factory()->create(['package_name' => $package]);

    $version = Version::create([
      'name'      => '1.4.0',
      'changelog' => 'Current',
      'app_id'    => $app->id,
      'status'    => 'published',
      'api_key'   => "key-$package",
      'file_id'   => $this->makeFile("$package-apk", "versions/$package.apk")->name,
      'default_bundle_version' => '0.0.1',
    ]);

    $app->update(['latest_id' => $version->id]);

    return [$app, $version];
  }

  private function info(App $app, string $version, string $bundle, string $key)
  {
    return $this->withHeaders([
      'X-Device-Info' => self::DEVICE_HEADER,
      'API-KEY'       => $key,
    ])->postJson('/ota-client/v1/app/info', [
      'package' => $app->package_name,
      'version' => $version,
      'bundle'  => $bundle,
    ]);
  }

  public function test_an_unlisted_installed_version_still_gets_the_version_update(): void
  {
    [$app, $version] = $this->appWithCurrentVersion();

    $this->info($app, '1.3.0', '0.0.2', "key-{$app->package_name}")
      ->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('data.availableUpdates.version.id', $version->id)
      ->assertJsonPath('data.availableUpdates.version.name', '1.4.0')
      ->assertJsonPath('data.availableUpdates.bundle', null)
      // The reported version has no row here, so there is no id to report.
      ->assertJsonPath('data.versionId', null);
  }

  public function test_an_unlisted_installed_version_is_authorized_by_the_current_key(): void
  {
    [$app] = $this->appWithCurrentVersion();

    $this->info($app, '1.3.0', '0.0.2', 'not-the-key')
      ->assertStatus(401)
      ->assertJsonPath('errors.api_key', 'Invalid API key');

    // The key is still checked before the device is registered.
    $this->assertDatabaseCount('devices', 0);
  }

  public function test_a_listed_version_accepts_the_default_bundle_version(): void
  {
    [$app] = $this->appWithCurrentVersion();

    $this->info($app, '1.4.0', '0.0.1', "key-{$app->package_name}")
      ->assertOk()
      ->assertJsonPath('data.availableUpdates.version', null)
      ->assertJsonPath('data.availableUpdates.bundle', null);
  }

  public function test_a_listed_version_still_rejects_an_unknown_bundle(): void
  {
    [$app] = $this->appWithCurrentVersion();

    $this->info($app, '1.4.0', '0.0.2', "key-{$app->package_name}")
      ->assertStatus(400)
      ->assertJsonPath('errors.bundle', 'Invalid bundle version');
  }

  public function test_a_listed_version_accepts_a_registered_bundle(): void
  {
    [$app, $version] = $this->appWithCurrentVersion();

    $bundle = Bundle::create([
      'version_id' => $version->id,
      'name'       => '0.0.2',
      'file_id'    => $this->makeFile("{$app->package_name}-b2", "bundles/{$app->package_name}.gz")->name,
    ]);

    $this->info($app, '1.4.0', '0.0.2', "key-{$app->package_name}")
      ->assertOk()
      ->assertJsonPath('data.bundleId', $bundle->id);
  }

  public function test_an_app_without_a_current_version_still_rejects_the_check(): void
  {
    Storage::fake('public');

    $app = App::factory()->create(['package_name' => 'com.example.empty']);

    $this->info($app, '1.3.0', '0.0.2', 'any-key')
      ->assertStatus(400)
      ->assertJsonPath('errors.version', 'Invalid version');
  }
}
