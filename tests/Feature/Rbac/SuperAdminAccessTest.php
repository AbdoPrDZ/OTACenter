<?php

namespace Tests\Feature\Rbac;

use App\Models\App;
use App\Models\AppScreenshot;
use App\Models\Bundle;
use App\Models\Domain;
use App\Models\File;
use App\Models\Version;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SuperAdminAccessTest extends TestCase
{
  private function makeVersion(?App $app = null): array
  {
    $app = $app ?? App::factory()->create();
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

  private function makeBundle(Version $version, string $name): Bundle
  {
    $file = File::create([
      'name' => $name . '-' . uniqid(),
      'disk' => 'public',
      'path' => 'bundles/' . $name . '.zip',
    ]);

    return Bundle::create([
      'version_id' => $version->id,
      'name' => $name,
      'file_id' => $file->name,
    ]);
  }

  private function fakeUpload(string $ext): UploadedFile
  {
    $tempFile = tempnam(sys_get_temp_dir(), 'upload');
    file_put_contents($tempFile, $ext === 'png'
      ? base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAA==')
      : 'not-a-real-archive');

    $mime = match ($ext) {
      'png' => 'image/png',
      'txt' => 'text/plain',
      default => 'application/octet-stream',
    };

    return new UploadedFile($tempFile, 'file.' . $ext, $mime, null, true);
  }

  public function test_unauthenticated_requests_are_rejected(): void
  {
    $this->getJson('/api/app')
      ->assertStatus(401);
  }

  public function test_superadmin_can_create_update_show_and_delete_an_app(): void
  {
    $headers = $this->superAdminHeaders();

    $create = $this->withHeaders($headers)
      ->postJson('/api/app', [
        'name' => 'Super App',
        'package_name' => 'super.app',
      ]);
    $create->assertOk()
      ->assertJsonPath('success', true);

    $appId = $create->json('item.id');

    $this->withHeaders($headers)
      ->putJson('/api/app/' . $appId, ['name' => 'Super App Updated'])
      ->assertOk()
      ->assertJsonPath('item.name', 'Super App Updated');

    $this->withHeaders($headers)
      ->getJson('/api/app/' . $appId)
      ->assertOk()
      ->assertJsonPath('item.package_name', 'super.app');

    $this->withHeaders($headers)
      ->deleteJson('/api/app/' . $appId)
      ->assertOk()
      ->assertJsonPath('message', 'App deleted successfully');

    $this->assertSoftDeleted('apps', ['id' => $appId]);
  }

  public function test_superadmin_can_create_update_show_and_delete_a_domain(): void
  {
    $headers = $this->superAdminHeaders();

    $create = $this->withHeaders($headers)
      ->postJson('/api/domain', [
        'name' => 'internal.example',
        'description' => 'Internal',
      ]);
    $create->assertOk()
      ->assertJsonPath('success', true);

    $domainId = $create->json('item.id');

    $this->withHeaders($headers)
      ->putJson('/api/domain/' . $domainId, ['description' => 'Updated'])
      ->assertOk();

    $this->withHeaders($headers)
      ->getJson('/api/domain/' . $domainId)
      ->assertOk()
      ->assertJsonPath('item.name', 'internal.example');

    $this->withHeaders($headers)
      ->deleteJson('/api/domain/' . $domainId)
      ->assertOk();

    $this->assertSoftDeleted('domains', ['id' => $domainId]);
  }

  public function test_superadmin_can_bind_a_domain_to_an_app(): void
  {
    $app = App::factory()->create();
    $domain = Domain::create(['name' => 'bind.example']);

    $this->withHeaders($this->superAdminHeaders())
      ->postJson('/api/app/' . $app->id . '/domain/' . $domain->id)
      ->assertOk()
      ->assertJsonPath('success', true);

    $this->assertDatabaseHas('app_domains', [
      'app_id' => $app->id,
      'domain_id' => $domain->id,
    ]);
  }

  public function test_superadmin_can_create_a_version(): void
  {
    Storage::fake('public');
    $app = App::factory()->create();

    $this->withHeaders($this->superAdminHeaders())
      ->post('/api/app/' . $app->id . '/version', [
        'name' => '1.0.0',
        'changelog' => 'Initial',
        'api_key' => 'test-api-key',
        'file' => $this->fakeUpload('apk'),
      ])
      ->assertOk()
      ->assertJsonPath('success', true);

    $this->assertDatabaseHas('versions', [
      'app_id' => $app->id,
      'name' => '1.0.0',
    ]);
  }

  public function test_superadmin_can_upload_activate_and_delete_a_bundle(): void
  {
    Storage::fake('public');
    [$app, $version] = $this->makeVersion();

    $create = $this->withHeaders($this->superAdminHeaders())
      ->post('/api/app/' . $app->id . '/version/' . $version->id . '/bundle', [
        'name' => 'web-bundle',
        'file' => $this->fakeUpload('zip'),
      ]);
    $create->assertOk()
      ->assertJsonPath('success', true);

    $bundleId = $create->json('item.id');

    $this->withHeaders($this->superAdminHeaders())
      ->postJson('/api/app/' . $app->id . '/version/' . $version->id . '/bundle/' . $bundleId . '/activate')
      ->assertOk();

    $this->assertDatabaseHas('versions', [
      'id' => $version->id,
      'latest_id' => $bundleId,
    ]);

    $this->withHeaders($this->superAdminHeaders())
      ->deleteJson('/api/app/' . $app->id . '/version/' . $version->id . '/bundle/' . $bundleId)
      ->assertOk();

    $this->assertSoftDeleted('bundles', ['id' => $bundleId]);
  }

  public function test_cannot_create_app_without_required_fields(): void
  {
    $this->withHeaders($this->superAdminHeaders())
      ->postJson('/api/app', ['summary' => 'no name'])
      ->assertStatus(400)
      ->assertJsonPath('success', false);
  }

  public function test_cannot_create_app_with_duplicate_package_name(): void
  {
    App::factory()->create(['package_name' => 'dup.app']);

    $this->withHeaders($this->superAdminHeaders())
      ->postJson('/api/app', [
        'name' => 'Dup',
        'package_name' => 'dup.app',
      ])
      ->assertStatus(400)
      ->assertJsonPath('success', false);
  }

  public function test_cannot_update_app_to_an_existing_package_name(): void
  {
    App::factory()->create(['package_name' => 'first.app']);
    $app = App::factory()->create(['package_name' => 'second.app']);

    $this->withHeaders($this->superAdminHeaders())
      ->putJson('/api/app/' . $app->id, ['package_name' => 'first.app'])
      ->assertStatus(400)
      ->assertJsonPath('success', false);
  }

  public function test_cannot_upload_non_image_as_app_logo(): void
  {
    $this->withHeaders($this->superAdminHeaders())
      ->post('/api/app', [
        'name' => 'Logo App',
        'package_name' => 'logo.app',
        'logo' => $this->fakeUpload('txt'),
      ])
      ->assertStatus(400)
      ->assertJsonPath('success', false);
  }

  public function test_cannot_create_domain_without_name(): void
  {
    $this->withHeaders($this->superAdminHeaders())
      ->postJson('/api/domain', ['description' => 'no name'])
      ->assertStatus(400)
      ->assertJsonPath('success', false);
  }

  public function test_cannot_create_version_without_file(): void
  {
    $app = App::factory()->create();

    $this->withHeaders($this->superAdminHeaders())
      ->postJson('/api/app/' . $app->id . '/version', [
        'name' => '1.0.0',
        'changelog' => 'x',
      ])
      ->assertStatus(400)
      ->assertJsonPath('success', false);
  }

  public function test_cannot_create_bundle_with_non_zip_file(): void
  {
    Storage::fake('public');
    [$app, $version] = $this->makeVersion();

    $this->withHeaders($this->superAdminHeaders())
      ->post('/api/app/' . $app->id . '/version/' . $version->id . '/bundle', [
        'name' => 'bad-bundle',
        'file' => $this->fakeUpload('txt'),
      ])
      ->assertStatus(400)
      ->assertJsonPath('success', false);
  }

  public function test_cannot_delete_a_version_under_another_app(): void
  {
    [$appA, $versionA] = $this->makeVersion();
    $appB = App::factory()->create();

    $this->withHeaders($this->superAdminHeaders())
      ->deleteJson('/api/app/' . $appB->id . '/version/' . $versionA->id)
      ->assertStatus(404)
      ->assertJsonPath('success', false);
  }

  public function test_cannot_show_a_bundle_under_another_version(): void
  {
    [$app, $versionA] = $this->makeVersion();
    [, $versionB] = $this->makeVersion($app);
    $bundle = $this->makeBundle($versionA, 'orphan-bundle');

    $this->withHeaders($this->superAdminHeaders())
      ->getJson('/api/app/' . $app->id . '/version/' . $versionB->id . '/bundle/' . $bundle->id)
      ->assertStatus(404)
      ->assertJsonPath('success', false);
  }

  public function test_cannot_activate_a_bundle_under_another_version(): void
  {
    [$app, $versionA] = $this->makeVersion();
    [, $versionB] = $this->makeVersion($app);
    $bundle = $this->makeBundle($versionA, 'orphan-bundle');

    $this->withHeaders($this->superAdminHeaders())
      ->postJson('/api/app/' . $app->id . '/version/' . $versionB->id . '/bundle/' . $bundle->id . '/activate')
      ->assertStatus(404)
      ->assertJsonPath('success', false);
  }

  public function test_cannot_delete_a_screenshot_of_another_app(): void
  {
    Storage::fake('public');
    $appA = App::factory()->create();
    $appB = App::factory()->create();

    $file = File::create([
      'name' => 'scr-' . uniqid(),
      'disk' => 'public',
      'path' => 'screenshots/scr.png',
    ]);
    $screenshot = AppScreenshot::create([
      'app_id' => $appA->id,
      'file_id' => $file->name,
    ]);

    $this->withHeaders($this->superAdminHeaders())
      ->deleteJson('/api/app/' . $appB->id . '/screenshot/' . $screenshot->id)
      ->assertStatus(400)
      ->assertJsonPath('success', false);
  }

  public function test_cannot_update_a_missing_app(): void
  {
    $this->withHeaders($this->superAdminHeaders())
      ->putJson('/api/app/999999', ['name' => 'Ghost'])
      ->assertStatus(404);
  }

  public function test_cannot_use_a_negative_id(): void
  {
    $this->withHeaders($this->superAdminHeaders())
      ->getJson('/api/app/-1')
      ->assertStatus(404);
  }

  public function test_cannot_use_a_non_numeric_id(): void
  {
    $this->withHeaders($this->superAdminHeaders())
      ->getJson('/api/app/not-a-number')
      ->assertStatus(404);
  }
}
