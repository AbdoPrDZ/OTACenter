<?php

namespace Tests\Feature;

use App\Models\App;
use App\Models\Device;
use App\Models\DeviceLinkCode;
use App\Models\Domain;
use App\Models\File;
use App\Models\Version;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * One-time codes link an (anonymous) device to a user, which is what decides
 * demo eligibility.
 */
class DeviceLinkTest extends TestCase
{
  private const KEY = 'link-api-key';
  private const PACKAGE = 'com.example.link';
  private const DID = 'link-device';

  private App $otaApp;

  protected function setUp(): void
  {
    parent::setUp();

    Storage::fake('public');
    Storage::disk('public')->put('versions/link.apk', 'apk');
    File::create(['name' => 'link-apk', 'disk' => 'public', 'path' => 'versions/link.apk']);

    $this->otaApp = App::factory()->create(['package_name' => self::PACKAGE]);
    $version = Version::create([
      'app_id'    => $this->otaApp->id,
      'name'      => '1.0.0',
      'changelog' => 'Initial',
      'status'    => 'published',
      'api_key'   => self::KEY,
      'file_id'   => 'link-apk',
    ]);
    $this->otaApp->update(['latest_id' => $version->id]);
  }

  private function device(string $action, array $body = []): TestResponse
  {
    $this->flushHeaders();

    return $this->withHeaders(['X-Device-Info' => 'did=' . self::DID, 'API-KEY' => self::KEY])
      ->postJson("/ota-client/v1/device/$action", ['package' => self::PACKAGE, 'version' => '1.0.0', ...$body]);
  }

  private function codeFor($user, ?App $app = null, int $ttl = 15): string
  {
    return DeviceLinkCode::issue($user, $app, null, $ttl)[1];
  }

  public function test_a_user_creates_a_code_for_themselves(): void
  {
    $user = $this->createUser('self', ['user']);

    $response = $this->withHeaders($this->headersFor($user))->postJson('/api/auth/device-link-code')->assertOk();

    $this->assertMatchesRegularExpression('/^[A-Z2-9]{8}$/', $response->json('item.code'));
    $this->assertDatabaseHas('device_link_codes', ['user_id' => $user->id, 'used_at' => null]);
    $this->assertDatabaseMissing('device_link_codes', ['code_hash' => $response->json('item.code')]);
  }

  public function test_an_admin_creates_a_code_for_another_user_but_a_plain_user_cannot(): void
  {
    $target = $this->createUser('target', ['user']);

    $this->withHeaders($this->authHeaders())->postJson("/api/user/$target->id/device-link-code", ['app_id' => $this->otaApp->id])
      ->assertOk()->assertJsonPath('item.app_id', $this->otaApp->id);

    # Sanctum caches the resolved user per test; drop it before switching users.
    $this->app['auth']->forgetGuards();
    $this->flushHeaders();
    $this->withHeaders($this->headersFor($this->createUser('plain', ['user'])))
      ->postJson("/api/user/$target->id/device-link-code")->assertForbidden();
  }

  public function test_a_device_links_with_a_code_and_reports_demo_eligibility(): void
  {
    $user = $this->createUser('linker', ['user']);
    $domain = Domain::create(['name' => 'Beta', 'allow_demo' => true]);
    $domain->apps()->attach($this->otaApp->id);
    $domain->users()->attach($user->id);

    # Lower case and a dash, as typed on a phone.
    $code = $this->codeFor($user);
    $typed = strtolower(substr($code, 0, 4) . '-' . substr($code, 4));

    $this->device('link', ['code' => $typed])->assertOk()
      ->assertJsonPath('data.linked', true)
      ->assertJsonPath('data.user.id', $user->id)
      ->assertJsonPath('data.demoEligible', true);

    $device = Device::where('did', self::DID)->firstOrFail();
    $this->assertSame($user->id, $device->user_id);
    $this->assertDatabaseHas('device_link_codes', ['device_id' => $device->id]);
    $this->assertDatabaseHas('logs', ['event' => 'device.linked']);
  }

  public function test_a_code_works_only_once(): void
  {
    $code = $this->codeFor($this->createUser('once', ['user']));

    $this->device('link', ['code' => $code])->assertOk();
    $this->device('link', ['code' => $code])->assertStatus(400)->assertJsonPath('success', false);
  }

  public function test_an_expired_code_is_refused(): void
  {
    $user = $this->createUser('late', ['user']);
    [$record, $code] = DeviceLinkCode::issue($user, null, null);
    $record->update(['expires_at' => now()->subMinute()]);

    $this->device('link', ['code' => $code])->assertStatus(400);
    $this->assertNull(Device::where('did', self::DID)->value('user_id'));
  }

  public function test_a_code_restricted_to_another_app_is_refused(): void
  {
    $other = App::factory()->create();
    $code = $this->codeFor($this->createUser('scoped', ['user']), $other);

    $this->device('link', ['code' => $code])->assertStatus(400);
  }

  public function test_linking_requires_the_api_key(): void
  {
    $code = $this->codeFor($this->createUser('nokey', ['user']));

    $this->withHeaders(['X-Device-Info' => 'did=' . self::DID, 'API-KEY' => 'wrong'])
      ->postJson('/ota-client/v1/device/link', ['package' => self::PACKAGE, 'version' => '1.0.0', 'code' => $code])
      ->assertStatus(401);
  }

  public function test_the_device_unlinks_itself(): void
  {
    $this->device('link', ['code' => $this->codeFor($this->createUser('leaver', ['user']))])->assertOk();

    $this->device('unlink')->assertOk()->assertJsonPath('data.linked', false);
    $this->assertNull(Device::where('did', self::DID)->value('user_id'));
  }

  public function test_an_admin_lists_and_unlinks_a_users_devices(): void
  {
    $user = $this->createUser('owner', ['user']);
    $this->device('link', ['code' => $this->codeFor($user)])->assertOk();
    $device = Device::where('did', self::DID)->firstOrFail();

    $this->flushHeaders();
    $this->withHeaders($this->authHeaders())->getJson("/api/user/$user->id/device")
      ->assertOk()->assertJsonPath('items.0.did', self::DID);

    $this->withHeaders($this->authHeaders())->deleteJson("/api/device/$device->id/link")->assertOk();
    $this->assertNull($device->fresh()->user_id);
  }

  public function test_the_status_of_an_unlinked_device(): void
  {
    $this->device('info')->assertOk()
      ->assertJsonPath('data.linked', false)
      ->assertJsonPath('data.demoEligible', false);
  }
}
