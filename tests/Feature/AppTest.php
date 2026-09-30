<?php

namespace Tests\Feature;

use App\Models\App;
use App\Models\AppDomain;
use App\Models\AppScreenshot;
use App\Models\Domain;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AppTest extends TestCase
{
  public function test_index_returns_apps(): void
  {
    App::factory()->create([
      'name' => 'API Center',
      'package_name' => 'api.center',
    ]);

    $response = $this->withHeaders($this->authHeaders())
      ->getJson('/api/app?page=1');

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('itemsCount', 1);
  }

  public function test_store_creates_an_app(): void
  {
    $response = $this->withHeaders($this->authHeaders())
      ->postJson('/api/app', [
        'name' => 'Created App',
        'package_name' => 'created.app',
        'summary' => 'Created from a feature test',
        'description' => 'Created from a feature test',
      ]);

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('item.package_name', 'created.app');

    $this->assertDatabaseHas('apps', [
      'package_name' => 'created.app',
      'name' => 'Created App',
    ]);
  }

  public function test_show_returns_an_app(): void
  {
    $app = App::factory()->create([
      'name' => 'Shown App',
      'package_name' => 'shown.app',
    ]);

    $response = $this->withHeaders($this->authHeaders())
      ->getJson('/api/app/' . $app->id);

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('item.package_name', 'shown.app');
  }

  public function test_update_changes_an_app(): void
  {
    $app = App::factory()->create([
      'name' => 'Editable App',
      'package_name' => 'editable.app',
    ]);

    $response = $this->withHeaders($this->authHeaders())
      ->putJson('/api/app/' . $app->id, [
        'name' => 'Updated App',
        'summary' => 'Updated summary',
      ]);

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('item.name', 'Updated App');

    $this->assertDatabaseHas('apps', [
      'id' => $app->id,
      'name' => 'Updated App',
    ]);
  }

  public function test_destroy_deletes_an_app(): void
  {
    $app = App::factory()->create();

    $response = $this->withHeaders($this->authHeaders())
      ->deleteJson('/api/app/' . $app->id);

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('message', 'App deleted successfully');

    $this->assertSoftDeleted('apps', [
      'id' => $app->id,
    ]);
  }

  public function test_screenshot_routes_store_list_and_delete_screenshots(): void
  {
    Storage::fake('public');

    $app = App::factory()->create();
    $tempFile = tempnam(sys_get_temp_dir(), 'screenshot');
    file_put_contents($tempFile, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAA=='));

    $storeResponse = $this->withHeaders($this->authHeaders())
      ->post('/api/app/' . $app->id . '/screenshot', [
        'file' => new UploadedFile($tempFile, 'screenshot.png', 'image/png', null, true),
      ]);

    $storeResponse->assertOk()
      ->assertJsonPath('success', true);

    $screenshot = AppScreenshot::query()->latest('id')->firstOrFail();

    $this->assertDatabaseHas('app_screenshots', [
      'id' => $screenshot->id,
      'app_id' => $app->id,
    ]);

    $indexResponse = $this->withHeaders($this->authHeaders())
      ->getJson('/api/app/' . $app->id . '/screenshot?page=1');

    $indexResponse->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('itemsCount', 1);

    $deleteResponse = $this->withHeaders($this->authHeaders())
      ->deleteJson('/api/app/' . $app->id . '/screenshot/' . $screenshot->id);

    $deleteResponse->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('message', 'App screenshot deleted successfully');

    $this->assertDatabaseMissing('app_screenshots', [
      'id' => $screenshot->id,
    ]);
  }

  public function test_app_domain_index_lists_bound_domains(): void
  {
    $app = App::factory()->create();
    $domain = Domain::create([
      'name' => 'app.example.test',
      'description' => 'App domain',
    ]);

    AppDomain::create([
      'app_id' => $app->id,
      'domain_id' => $domain->id,
    ]);

    $listResponse = $this->withHeaders($this->authHeaders())
      ->getJson('/api/app/' . $app->id . '/domain?page=1');

    $listResponse->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('itemsCount', 1);
  }
}
