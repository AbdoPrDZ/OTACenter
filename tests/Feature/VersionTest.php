<?php

namespace Tests\Feature;

use App\Models\App;
use App\Models\File;
use App\Models\Version;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class VersionTest extends TestCase
{
  public function test_index_returns_versions_for_an_app(): void
  {
    $app = App::factory()->create();
    File::create([
      'name' => 'version-file-index',
      'disk' => 'public',
      'path' => 'versions/version-file-index.png',
    ]);

    Version::create([
      'name' => '1.0.0',
      'changelog' => 'Initial release',
      'app_id' => $app->id,
      'status' => 'draft',
      'api_key' => 'test-api-key',
      'file_id' => 'version-file-index',
    ]);

    $response = $this->withHeaders($this->authHeaders())
      ->getJson('/api/app/' . $app->id . '/version?page=1');

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('itemsCount', 1);
  }

  public function test_store_creates_a_version(): void
  {
    Storage::fake('public');

    $app = App::factory()->create();
    $tempFile = tempnam(sys_get_temp_dir(), 'version');
    file_put_contents($tempFile, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAA=='));

    $response = $this->withHeaders($this->authHeaders())
      ->post('/api/app/' . $app->id . '/version', [
        'name' => '1.0.0',
        'changelog' => 'Initial release',
        'api_key' => 'test-api-key',
        'file' => new UploadedFile($tempFile, 'version.apk', 'application/vnd.android.package-archive', null, true),
      ]);

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('item.name', '1.0.0');

    $this->assertDatabaseHas('versions', [
      'app_id' => $app->id,
      'name' => '1.0.0',
    ]);
  }

  public function test_destroy_deletes_a_version(): void
  {
    $app = App::factory()->create();
    File::create([
      'name' => 'version-file-delete',
      'disk' => 'public',
      'path' => 'versions/version-file-delete.png',
    ]);

    $version = Version::create([
      'name' => '2.0.0',
      'changelog' => 'Second release',
      'app_id' => $app->id,
      'status' => 'draft',
      'api_key' => 'test-api-key',
      'file_id' => 'version-file-delete',
    ]);

    $response = $this->withHeaders($this->authHeaders())
      ->deleteJson('/api/app/' . $app->id . '/version/' . $version->id);

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('message', 'Version deleted successfully');

    $this->assertSoftDeleted('versions', [
      'id' => $version->id,
    ]);
  }
}
