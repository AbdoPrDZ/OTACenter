<?php

namespace Tests\Feature;

use App\Models\App;
use App\Models\Bundle;
use App\Models\File;
use App\Models\Version;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * A version or bundle is either `optional` (the device may skip it) or `force`
 * (the OTA client must install it). The flag is reported per offered update.
 */
class OtaUpdateTypeTest extends TestCase
{
  private const DEVICE_HEADER = 'did=update-type-device;mf=Xiaomi;br=Redmi;mdl=M2004J19C;av=12;sdv=31';

  private function makeFile(string $name, string $path): File
  {
    Storage::disk('public')->put($path, 'bytes');

    return File::create(['name' => $name, 'disk' => 'public', 'path' => $path]);
  }

  /**
   * A published app/version/bundle the device reports as its current install.
   *
   * @return array{0: App, 1: Version, 2: Bundle}
   */
  private function boot(string $package = 'com.example.update-type'): array
  {
    Storage::fake('public');

    $app = App::factory()->create(['package_name' => $package]);

    $version = Version::create([
      'name'      => '1.0.0',
      'changelog' => 'Initial',
      'app_id'    => $app->id,
      'status'    => 'published',
      'api_key'   => "key-$package",
      'file_id'   => $this->makeFile("$package-v1", "versions/$package-v1.apk")->name,
    ]);

    $bundle = Bundle::create([
      'version_id' => $version->id,
      'name'       => '1.0.0',
      'file_id'    => $this->makeFile("$package-b1", "bundles/$package-b1.gz")->name,
    ]);

    return [$app, $version, $bundle];
  }

  private function info(App $app)
  {
    return $this->withHeaders([
      'X-Device-Info' => self::DEVICE_HEADER,
      'API-KEY'       => $app->fresh()->versions()->first()->api_key,
    ])->postJson('/ota-client/v1/app/info', [
      'package' => $app->package_name,
      'version' => '1.0.0',
      'bundle'  => '1.0.0',
    ]);
  }

  public function test_a_forced_version_update_is_reported_as_force(): void
  {
    [$app, ] = $this->boot();

    $offered = Version::create([
      'name'        => '2.0.0',
      'changelog'   => 'Big change',
      'app_id'      => $app->id,
      'status'      => 'published',
      'update_type' => 'force',
      'api_key'     => 'key-2',
      'file_id'     => $this->makeFile('offered-v2', 'versions/offered-v2.apk')->name,
    ]);

    $app->update(['latest_id' => $offered->id]);

    $this->info($app)
      ->assertOk()
      ->assertJsonPath('data.availableUpdates.version.id', $offered->id)
      ->assertJsonPath('data.availableUpdates.version.updateType', 'force');
  }

  public function test_a_forced_bundle_update_is_reported_as_force(): void
  {
    [$app, $version, ] = $this->boot();

    $offered = Bundle::create([
      'version_id'  => $version->id,
      'name'        => '2.0.0',
      'update_type' => 'force',
      'file_id'     => $this->makeFile('offered-b2', 'bundles/offered-b2.gz')->name,
    ]);

    $version->update(['latest_id' => $offered->id]);
    $app->update(['latest_id' => $version->id]);

    $this->info($app)
      ->assertOk()
      ->assertJsonPath('data.availableUpdates.version', null)
      ->assertJsonPath('data.availableUpdates.bundle.id', $offered->id)
      ->assertJsonPath('data.availableUpdates.bundle.updateType', 'force');
  }

  public function test_an_update_defaults_to_optional(): void
  {
    [$app, ] = $this->boot();

    $offered = Version::create([
      'name'      => '2.0.0',
      'changelog' => 'Small change',
      'app_id'    => $app->id,
      'status'    => 'published',
      'api_key'   => 'key-2',
      'file_id'   => $this->makeFile('offered-default', 'versions/offered-default.apk')->name,
    ]);

    $app->update(['latest_id' => $offered->id]);

    $this->info($app)
      ->assertOk()
      ->assertJsonPath('data.availableUpdates.version.updateType', 'optional');
  }

  public function test_the_version_update_type_is_writable(): void
  {
    [$app, $version, ] = $this->boot();

    $this->withHeaders($this->authHeaders())
      ->putJson("/api/app/{$app->id}/version/{$version->id}", ['update_type' => 'force'])
      ->assertOk();

    $this->assertDatabaseHas('versions', ['id' => $version->id, 'update_type' => 'force']);
  }

  public function test_the_bundle_update_type_is_writable(): void
  {
    [$app, $version, $bundle] = $this->boot();

    $this->withHeaders($this->authHeaders())
      ->putJson("/api/app/{$app->id}/version/{$version->id}/bundle/{$bundle->id}", ['update_type' => 'force'])
      ->assertOk();

    $this->assertDatabaseHas('bundles', ['id' => $bundle->id, 'update_type' => 'force']);
  }

  public function test_the_update_type_only_accepts_the_two_values(): void
  {
    [$app, $version, ] = $this->boot();

    $this->withHeaders($this->authHeaders())
      ->putJson("/api/app/{$app->id}/version/{$version->id}", ['update_type' => 'mandatory'])
      ->assertStatus(400);
  }
}
