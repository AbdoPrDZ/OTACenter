<?php

namespace Tests\Feature;

use App\Models\App;
use App\Models\AppScreenshot;
use App\Models\Domain;
use App\Models\File;
use App\Models\Version;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * The public store: unauthenticated, limited to apps in a domain flagged
 * `is_public` that also have a published version.
 */
class PublicStoreTest extends TestCase
{
  private function makeFile(string $name, string $path, string $contents = 'bytes'): File
  {
    Storage::disk('public')->put($path, $contents);

    return File::create(['name' => $name, 'disk' => 'public', 'path' => $path]);
  }

  /**
   * @return array{0: App, 1: Version}
   */
  private function makePublicApp(
    string $package = 'com.example.public',
    string $versionStatus = 'published',
    bool $public = true,
  ): array {
    Storage::fake('public');

    $domain = Domain::create(['name' => 'Public ' . $package, 'is_public' => $public]);

    $app = App::factory()->create(['package_name' => $package]);
    $app->domains()->attach($domain->id);

    $file = $this->makeFile("$package-version", "versions/$package.apk", 'apk-contents');

    $version = Version::create([
      'name'      => '1.0.0',
      'changelog' => 'Initial release',
      'app_id'    => $app->id,
      'status'    => $versionStatus,
      'api_key'   => "key-$package",
      'file_id'   => $file->name,
    ]);

    return [$app, $version];
  }

  public function test_it_lists_apps_from_public_domains(): void
  {
    [$app] = $this->makePublicApp();

    $response = $this->getJson('/api/public/apps');

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('items.0.id', $app->id)
      ->assertJsonPath('items.0.package_name', 'com.example.public')
      ->assertJsonPath('items.0.version', '1.0.0');
  }

  public function test_it_hides_apps_from_private_domains(): void
  {
    [$app] = $this->makePublicApp('com.example.private', public: false);

    $this->getJson('/api/public/apps')
      ->assertOk()
      ->assertJsonCount(0, 'items');

    $this->getJson("/api/public/apps/{$app->id}")->assertStatus(404);
    $this->get("/api/public/apps/{$app->id}/download")->assertStatus(404);
  }

  public function test_it_hides_apps_without_a_published_version(): void
  {
    [$app] = $this->makePublicApp('com.example.draft', versionStatus: 'draft');

    $this->getJson('/api/public/apps')
      ->assertOk()
      ->assertJsonCount(0, 'items');

    $this->getJson("/api/public/apps/{$app->id}")->assertStatus(404);
  }

  public function test_the_detail_returns_screenshots_versions_and_a_download_url(): void
  {
    [$app, $version] = $this->makePublicApp();

    $screenshot = $this->makeFile('public-app-shot', 'screenshots/public-app-shot.png');
    AppScreenshot::create(['app_id' => $app->id, 'file_id' => $screenshot->name]);

    $response = $this->getJson("/api/public/apps/{$app->id}");

    $response->assertOk()
      ->assertJsonPath('item.id', $app->id)
      ->assertJsonPath('item.screenshots.0', $screenshot->url)
      ->assertJsonPath('item.versions.0.name', '1.0.0')
      ->assertJsonPath('item.download_url', url("/api/public/apps/{$app->id}/download"));

    $this->assertSame(strlen('apk-contents'), $response->json('item.versions.0.size'));
    $this->assertSame($version->id, $response->json('item.versions.0.id'));
  }

  public function test_the_download_streams_the_apk_and_records_history(): void
  {
    [$app, $version] = $this->makePublicApp();

    $response = $this->get("/api/public/apps/{$app->id}/download");

    $response->assertOk();
    $response->assertDownload('com.example.public-1.0.0.apk');

    $this->assertDatabaseHas('download_histories', [
      'device_id'   => null,
      'user_id'     => null,
      'target_type' => Version::class,
      'target_id'   => $version->id,
    ]);
  }

  public function test_the_payloads_never_expose_privileged_fields(): void
  {
    [$app] = $this->makePublicApp();

    $list = $this->getJson('/api/public/apps')->getContent();
    $detail = $this->getJson("/api/public/apps/{$app->id}")->getContent();

    foreach ([$list, $detail] as $payload) {
      $this->assertStringNotContainsString('api_key', $payload);
      $this->assertStringNotContainsString('file_id', $payload);
      $this->assertStringNotContainsString('versions/com.example.public.apk', $payload);
    }
  }

  public function test_the_domains_endpoint_lists_only_public_domains_with_apps(): void
  {
    [$app] = $this->makePublicApp();
    $this->makePublicApp('com.example.private-domain', public: false);

    // Swap the app's own domain for a private one, so only the first stays public.
    $domain = $app->domains()->first();

    $response = $this->getJson('/api/public/domains');

    $response->assertOk()->assertJsonCount(1, 'items')
      ->assertJsonPath('items.0.id', $domain->id)
      ->assertJsonPath('items.0.apps_count', 1);
  }
}
