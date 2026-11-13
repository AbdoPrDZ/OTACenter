<?php

namespace Tests\Feature;

use App\Models\App;
use App\Models\Bundle;
use App\Models\BundleAsset;
use App\Models\Device;
use App\Models\Domain;
use App\Models\File;
use App\Models\User;
use App\Models\Version;
use App\Services\Releases\DemoAccess;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Demo releases: versions/bundles published only to devices whose user belongs
 * to a domain with `allow_demo` that is bound to the app, until promoted.
 */
class DemoReleaseTest extends TestCase
{
  private const KEY = 'demo-api-key';
  private const PACKAGE = 'com.example.demo';
  private const TESTER_DID = 'tester-device';
  private const OTHER_DID = 'other-device';

  private App $otaApp;
  private Version $version;
  private Bundle $public;
  private Bundle $demo;
  private Domain $domain;
  private User $tester;

  protected function setUp(): void
  {
    parent::setUp();

    Storage::fake('public');

    $this->otaApp = App::factory()->create(['package_name' => self::PACKAGE]);

    $this->version = Version::create([
      'app_id'    => $this->otaApp->id,
      'name'      => '1.0.0',
      'changelog' => 'Initial',
      'status'    => 'published',
      'api_key'   => self::KEY,
      'file_id'   => $this->file('v1', 'versions/v1.apk')->name,
    ]);
    $this->otaApp->update(['latest_id' => $this->version->id]);

    $this->public = $this->bundle('1.0.0', now()->subDays(2));
    $this->demo = $this->bundle('1.0.1', now()->subDay(), demo: true);
    $this->version->update(['latest_id' => $this->public->id, 'demo_latest_id' => $this->demo->id]);

    $this->domain = Domain::create(['name' => 'Testers', 'allow_demo' => true]);
    $this->domain->apps()->attach($this->otaApp->id);

    $this->tester = $this->createUser('tester', ['user']);
    $this->domain->users()->attach($this->tester->id);

    Device::create(['did' => self::TESTER_DID, 'user_id' => $this->tester->id]);
  }

  /* ------------------------------ fixtures ----------------------------- */

  private function file(string $name, string $path): File
  {
    Storage::disk('public')->put($path, "bytes-$name");

    return File::create(['name' => "demo-$name", 'disk' => 'public', 'path' => $path]);
  }

  private function bundle(string $name, $createdAt, bool $demo = false, ?Version $version = null): Bundle
  {
    $bundle = Bundle::create([
      'version_id' => ($version ?? $this->version)->id,
      'name'       => $name,
      'is_demo'    => $demo,
      'file_id'    => $this->file("b-$name-" . Str::random(4), "bundles/$name-" . Str::random(4) . '.gz')->name,
    ]);
    $bundle->forceFill(['created_at' => $createdAt])->save();

    return $bundle;
  }

  private function info(string $did = self::TESTER_DID, string $version = '1.0.0', string $bundle = '1.0.0'): TestResponse
  {
    $this->flushHeaders();

    return $this->withHeaders([
      'X-Device-Info' => "did=$did;mf=Google;mdl=Pixel",
      'API-KEY'       => self::KEY,
    ])->postJson('/ota-client/v1/app/info', [
      'package' => self::PACKAGE,
      'version' => $version,
      'bundle'  => $bundle,
    ])->assertOk();
  }

  private function offeredBundle(string $did = self::TESTER_DID): ?string
  {
    return $this->info($did)->json('data.availableUpdates.bundle.name');
  }

  private function admin(string $method, string $uri): TestResponse
  {
    $this->flushHeaders();

    return $this->withHeaders($this->authHeaders())->json($method, $uri);
  }

  /* ---------------------------- eligibility ---------------------------- */

  public function test_an_eligible_device_is_offered_the_demo_bundle(): void
  {
    $response = $this->info();

    $response->assertJsonPath('data.availableUpdates.bundle.name', '1.0.1')
      ->assertJsonPath('data.availableUpdates.bundle.demo', true);
  }

  public function test_a_device_without_a_linked_user_is_not_offered_the_demo(): void
  {
    $this->assertNull($this->offeredBundle(self::OTHER_DID));
  }

  public function test_a_user_outside_the_demo_domain_is_not_offered_the_demo(): void
  {
    $other = $this->createUser('outsider', ['user']);
    Device::create(['did' => self::OTHER_DID, 'user_id' => $other->id]);

    $this->assertNull($this->offeredBundle(self::OTHER_DID));
  }

  public function test_a_domain_without_allow_demo_grants_nothing(): void
  {
    $this->domain->update(['allow_demo' => false]);

    $this->assertNull($this->offeredBundle());
  }

  public function test_a_demo_domain_not_bound_to_the_app_grants_nothing(): void
  {
    $this->domain->apps()->detach($this->otaApp->id);

    $this->assertNull($this->offeredBundle());
    $this->assertFalse(DemoAccess::allows(Device::where('did', self::TESTER_DID)->first(), $this->otaApp));
  }

  public function test_a_public_hotfix_newer_than_the_demo_reaches_testers(): void
  {
    $hotfix = $this->bundle('1.0.2', now());
    $this->version->update(['latest_id' => $hotfix->id]);

    $this->assertSame('1.0.2', $this->offeredBundle());
  }

  /* ----------------------------- downloads ----------------------------- */

  public function test_the_demo_bundle_downloads_only_for_an_eligible_device(): void
  {
    $url = "/ota-client/v1/app/update/bundle/{$this->demo->id}";

    $this->flushHeaders();
    $this->withHeaders(['X-Device-Info' => 'did=' . self::OTHER_DID, 'API-KEY' => self::KEY])->get($url)->assertNotFound();

    $this->flushHeaders();
    $this->withHeaders(['X-Device-Info' => 'did=' . self::TESTER_DID, 'API-KEY' => self::KEY])->get($url)->assertOk();
  }

  /* ---------------------- promotion and withdrawal --------------------- */

  public function test_promoting_the_demo_makes_it_public_for_everyone(): void
  {
    $base = "/api/app/{$this->otaApp->id}/version/{$this->version->id}/bundle";

    $this->admin('POST', "$base/{$this->demo->id}/promote")->assertOk();

    $this->demo->refresh();
    $this->assertFalse($this->demo->is_demo);
    $this->assertNotNull($this->demo->promoted_at);
    $this->assertSame($this->demo->id, $this->version->fresh()->latest_id);
    $this->assertNull($this->version->fresh()->demo_latest_id);

    $this->assertSame('1.0.1', $this->offeredBundle(self::OTHER_DID));
    $this->assertDatabaseHas('logs', ['event' => 'bundle.promoted']);
  }

  public function test_only_a_demo_bundle_can_be_promoted(): void
  {
    $base = "/api/app/{$this->otaApp->id}/version/{$this->version->id}/bundle";

    $this->admin('POST', "$base/{$this->public->id}/promote")->assertStatus(400);
  }

  public function test_activating_a_demo_bundle_publicly_promotes_it(): void
  {
    $base = "/api/app/{$this->otaApp->id}/version/{$this->version->id}/bundle";

    $this->admin('POST', "$base/{$this->demo->id}/activate")->assertOk();

    $this->assertFalse($this->demo->fresh()->is_demo);
    $this->assertNull($this->version->fresh()->demo_latest_id);
  }

  public function test_setting_latest_id_through_a_version_update_promotes_a_demo(): void
  {
    $this->admin('PUT', "/api/app/{$this->otaApp->id}/version/{$this->version->id}?latest_id={$this->demo->id}")->assertOk();

    $this->assertFalse($this->demo->fresh()->is_demo);
    $this->assertNull($this->version->fresh()->demo_latest_id);
  }

  public function test_withdrawing_the_demo_returns_testers_to_the_public_bundle(): void
  {
    $this->admin('DELETE', "/api/app/{$this->otaApp->id}/version/{$this->version->id}/bundle/demo")->assertOk();

    $this->assertNull($this->version->fresh()->demo_latest_id);
    $this->assertNull($this->offeredBundle());

    # A tester already running the demo is offered the public bundle back.
    $this->assertSame('1.0.0', $this->info(bundle: '1.0.1')->json('data.availableUpdates.bundle.name'));
  }

  public function test_a_bundle_can_be_published_as_a_demo(): void
  {
    $next = $this->bundle('1.0.3', now());
    $base = "/api/app/{$this->otaApp->id}/version/{$this->version->id}/bundle";

    $this->admin('POST', "$base/{$next->id}/activate-demo")->assertOk();

    $this->assertTrue($next->fresh()->is_demo);
    $this->assertSame($next->id, $this->version->fresh()->demo_latest_id);
    $this->assertSame('1.0.3', $this->offeredBundle());
    $this->assertNull($this->offeredBundle(self::OTHER_DID));
  }

  public function test_the_public_bundle_cannot_become_a_demo(): void
  {
    $base = "/api/app/{$this->otaApp->id}/version/{$this->version->id}/bundle";

    $this->admin('POST', "$base/{$this->public->id}/activate-demo")->assertStatus(400);
  }

  public function test_a_plain_user_cannot_publish_demos(): void
  {
    $base = "/api/app/{$this->otaApp->id}/version/{$this->version->id}/bundle";

    $this->flushHeaders();
    $this->withHeaders($this->headersFor($this->tester))->postJson("$base/{$this->demo->id}/promote")->assertForbidden();
  }

  /* ------------------------------ versions ----------------------------- */

  private function demoVersion(): Version
  {
    $demo = Version::create([
      'app_id'    => $this->otaApp->id,
      'name'      => '2.0.0',
      'changelog' => 'Next',
      'status'    => 'published',
      'is_demo'   => true,
      'api_key'   => 'demo-v2-key',
      'file_id'   => $this->file('v2', 'versions/v2.apk')->name,
    ]);
    $this->otaApp->update(['demo_latest_id' => $demo->id]);

    return $demo;
  }

  public function test_a_demo_version_is_offered_only_to_eligible_devices(): void
  {
    $this->demoVersion();

    $this->info()->assertJsonPath('data.availableUpdates.version.name', '2.0.0')
      ->assertJsonPath('data.availableUpdates.version.demo', true);
    $this->info(self::OTHER_DID)->assertJsonPath('data.availableUpdates.version', null);
  }

  public function test_the_demo_version_installer_downloads_only_for_an_eligible_device(): void
  {
    $demo = $this->demoVersion();
    $url = "/ota-client/v1/app/update/version/$demo->id";

    $this->flushHeaders();
    $this->withHeaders(['X-Device-Info' => 'did=' . self::OTHER_DID, 'API-KEY' => 'demo-v2-key'])->get($url)->assertNotFound();

    $this->flushHeaders();
    $this->withHeaders(['X-Device-Info' => 'did=' . self::TESTER_DID, 'API-KEY' => 'demo-v2-key'])->get($url)->assertOk();
  }

  public function test_a_tester_on_a_newer_demo_build_is_not_offered_an_older_public_apk(): void
  {
    $demo = $this->demoVersion();
    $this->admin('DELETE', "/api/app/{$this->otaApp->id}/version/demo")->assertOk();

    $this->flushHeaders();
    $this->withHeaders(['X-Device-Info' => 'did=' . self::TESTER_DID, 'API-KEY' => 'demo-v2-key'])
      ->postJson('/ota-client/v1/app/info', ['package' => self::PACKAGE, 'version' => $demo->name, 'bundle' => '2.0.0'])
      ->assertJsonPath('data.availableUpdates.version', null);
  }

  public function test_promoting_a_demo_version_publishes_it(): void
  {
    $demo = $this->demoVersion();

    $this->admin('POST', "/api/app/{$this->otaApp->id}/version/$demo->id/promote")->assertOk();

    $this->assertSame($demo->id, $this->otaApp->fresh()->latest_id);
    $this->assertNull($this->otaApp->fresh()->demo_latest_id);
    $this->assertFalse($demo->fresh()->is_demo);
    $this->info(self::OTHER_DID)->assertJsonPath('data.availableUpdates.version.name', '2.0.0');
  }

  public function test_the_store_never_falls_back_to_a_demo_version(): void
  {
    $this->domain->update(['is_public' => true]);
    $this->demoVersion();
    $this->otaApp->update(['latest_id' => null]);
    $this->version->update(['status' => 'draft']);

    $this->flushHeaders();
    $this->getJson("/api/public/apps/{$this->otaApp->id}/download")->assertNotFound();
  }

  /* -------------------------------- expo ------------------------------- */

  /** An Expo bundle with one android launch asset, stored on the fake disk. */
  private function expoBundle(Version $version, string $name, $createdAt, bool $demo = false): Bundle
  {
    $bundle = $this->bundle($name, $createdAt, $demo, $version);
    $path = "bundles/expo/$bundle->id/index.hbc";
    Storage::disk('public')->put($path, "js-$name");

    BundleAsset::create([
      'bundle_id'       => $bundle->id,
      'platform'        => 'android',
      'source_path'     => 'index.hbc',
      'path'            => $path,
      'key'             => md5("js-$name"),
      'hash'            => rtrim(strtr(base64_encode(hash('sha256', "js-$name", true)), '+/', '-_'), '='),
      'content_type'    => 'application/javascript',
      'is_launch_asset' => true,
      'size'            => strlen("js-$name"),
    ]);
    $bundle->update(['expo_update_id' => (string) Str::uuid()]);

    return $bundle;
  }

  private function expoManifest(string $did, ?string $current = null): string
  {
    $this->flushHeaders();
    $response = $this->withHeaders(array_filter([
      'expo-protocol-version'  => '1',
      'expo-platform'          => 'android',
      'expo-runtime-version'   => '1.0.0',
      'API-KEY'                => self::KEY,
      'expo-extra-params'      => "did=\"$did\"",
      'expo-current-update-id' => $current,
    ]))->get('/ota-client/v1/expo/' . self::PACKAGE . '/manifest')->assertOk();

    return $response->getContent();
  }

  public function test_expo_devices_get_the_demo_bundle_only_when_eligible(): void
  {
    $this->version->update(['client_type' => Version::CLIENT_EXPO]);
    $public = $this->expoBundle($this->version, '1.1.0', now()->subDay());
    $demo = $this->expoBundle($this->version, '1.2.0', now(), demo: true);
    $this->version->update(['latest_id' => $public->id, 'demo_latest_id' => $demo->id]);

    $this->assertStringContainsString($demo->expo_update_id, $this->expoManifest(self::TESTER_DID));
    $this->assertStringContainsString('"demo":true', $this->expoManifest(self::TESTER_DID));
    $this->assertStringContainsString($public->expo_update_id, $this->expoManifest(self::OTHER_DID));

    # Losing demo access while running the demo rolls the device back first.
    $this->domain->users()->detach($this->tester->id);
    $this->assertStringContainsString('rollBackToEmbedded', $this->expoManifest(self::TESTER_DID, $demo->expo_update_id));
  }
}
