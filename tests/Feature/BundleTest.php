<?php

namespace Tests\Feature;

use App\Models\App;
use App\Models\Bundle;
use App\Models\File;
use App\Models\Version;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BundleTest extends TestCase
{
  private function createVersion(): array
  {
    $app = App::factory()->create();
    $file = File::create([
      'name' => 'version-file-' . uniqid(),
      'disk' => 'public',
      'path' => 'versions/version-file.png',
    ]);

    $version = Version::create([
      'name' => '1.0.0',
      'changelog' => 'Initial release',
      'app_id' => $app->id,
      'status' => 'draft',
      'file_id' => $file->name,
    ]);

    return [$app, $version];
  }

  private function createBundle(Version $version, string $name): Bundle
  {
    $file = File::create([
      'name' => $name,
      'disk' => 'public',
      'path' => 'bundles/' . $name . '.zip',
    ]);

    return Bundle::create([
      'version_id' => $version->id,
      'name' => $name,
      'file_id' => $file->name,
    ]);
  }

  public function test_index_returns_bundles_for_a_version(): void
  {
    [$app, $version] = $this->createVersion();
    $this->createBundle($version, 'bundle-index');

    $response = $this->withHeaders($this->authHeaders())
      ->getJson('/api/app/' . $app->id . '/version/' . $version->id . '/bundle?page=1');

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('itemsCount', 1);
  }

  public function test_store_creates_a_bundle(): void
  {
    Storage::fake('public');

    [$app, $version] = $this->createVersion();
    $tempFile = tempnam(sys_get_temp_dir(), 'bundle');
    file_put_contents($tempFile, 'not-a-real-archive');

    $response = $this->withHeaders($this->authHeaders())
      ->post('/api/app/' . $app->id . '/version/' . $version->id . '/bundle', [
        'name' => 'bundle-a',
        'file' => new UploadedFile($tempFile, 'bundle.zip', 'application/zip', null, true),
      ]);

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('item.name', 'bundle-a');

    $this->assertDatabaseHas('bundles', [
      'version_id' => $version->id,
      'name' => 'bundle-a',
    ]);
  }

  public function test_show_returns_a_bundle(): void
  {
    [$app, $version] = $this->createVersion();
    $bundle = $this->createBundle($version, 'bundle-show');

    $response = $this->withHeaders($this->authHeaders())
      ->getJson('/api/app/' . $app->id . '/version/' . $version->id . '/bundle/' . $bundle->id);

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('item.name', 'bundle-show');
  }

    public function test_show_rejects_a_bundle_from_another_version(): void
    {
        [$app, $version] = $this->createVersion();
        [, $otherVersion] = $this->createVersion();
        $bundle = $this->createBundle($otherVersion, 'bundle-other');

        $response = $this->withHeaders($this->authHeaders())
            ->getJson('/api/app/' . $app->id . '/version/' . $version->id . '/bundle/' . $bundle->id);

        $response->assertStatus(404)
            ->assertJsonPath('success', false);
    }

    public function test_activate_marks_the_latest_bundle(): void
  {
    [$app, $version] = $this->createVersion();
    $bundle = $this->createBundle($version, 'bundle-active');

    $response = $this->withHeaders($this->authHeaders())
      ->postJson('/api/app/' . $app->id . '/version/' . $version->id . '/bundle/' . $bundle->id . '/activate');

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('message', 'Bundle activated successfully');

    $this->assertDatabaseHas('versions', [
      'id' => $version->id,
      'latest_id' => $bundle->id,
    ]);
  }

  public function test_destroy_deletes_a_bundle_and_clears_active(): void
  {
    [$app, $version] = $this->createVersion();
    $bundle = $this->createBundle($version, 'bundle-delete');

    $version->update(['latest_id' => $bundle->id]);

    $response = $this->withHeaders($this->authHeaders())
      ->deleteJson('/api/app/' . $app->id . '/version/' . $version->id . '/bundle/' . $bundle->id);

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('message', 'Bundle deleted successfully');

    $this->assertSoftDeleted('bundles', [
      'id' => $bundle->id,
    ]);

    $this->assertDatabaseHas('versions', [
      'id' => $version->id,
      'latest_id' => null,
    ]);
  }
}
