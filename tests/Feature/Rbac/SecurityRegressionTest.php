<?php

namespace Tests\Feature\Rbac;

use App\Models\App;
use App\Models\Device;
use App\Models\File;
use App\Models\Permission;
use App\Models\Review;
use App\Models\Role;
use App\Models\User;
use App\Models\Version;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SecurityRegressionTest extends TestCase
{
  /** Requests in one test switch users: drop the guard's cached user between them. */
  private function actingWith(User $user): static
  {
    $this->app['auth']->forgetGuards();

    return $this->withHeaders($this->headersFor($user));
  }

  private function makeVersion(string $path = 'versions/app.apk'): array
  {
    $app = App::factory()->create();
    $file = File::create(['name' => 'version-file-' . uniqid(), 'disk' => 'public', 'path' => $path]);

    $version = Version::create([
      'name'    => '1.0.0',
      'changelog' => 'Initial',
      'app_id'  => $app->id,
      'status'  => 'published',
      'file_id' => $file->name,
      'api_key' => 'secret-version-key',
    ]);

    return [$app, $version, $file];
  }

  /* ------------------------------------------------ data exposure ---- */

  public function test_a_plain_user_never_receives_version_api_keys(): void
  {
    [$app] = $this->makeVersion();

    $this->actingWith($this->createUser('plain_user', ['user']))
      ->getJson("/api/app/{$app->id}/version?page=1")
      ->assertOk()
      ->assertJsonMissingPath('items.0.api_key')
      ->assertJsonMissingPath('items.0.url');

    $this->actingWith($this->createUser('dev_user', ['developer']))
      ->getJson("/api/app/{$app->id}/version?page=1")
      ->assertOk()
      ->assertJsonPath('items.0.api_key', 'secret-version-key');
  }

  public function test_build_artifacts_are_not_served_publicly(): void
  {
    Storage::fake('public');
    Storage::disk('public')->put('versions/app.apk', 'apk-bytes');
    Storage::disk('public')->put('apps/logo.png', 'png-bytes');

    [, , $apk] = $this->makeVersion('versions/app.apk');
    $logo = File::create(['name' => 'logo-' . uniqid(), 'disk' => 'public', 'path' => 'apps/logo.png']);

    $this->get("/files/{$apk->name}")->assertNotFound();

    $this->actingWith($this->createUser('plain_user', ['user']))
      ->get("/files/{$apk->name}")
      ->assertNotFound();

    $this->actingWith($this->createUser('dev_user', ['developer']))
      ->get("/files/{$apk->name}")
      ->assertOk();

    $this->app['auth']->forgetGuards();
    $this->withHeaders(['Authorization' => ''])
      ->get("/files/{$logo->name}")
      ->assertOk()
      ->assertHeader('X-Content-Type-Options', 'nosniff')
      ->assertHeader('Content-Security-Policy');
  }

  /* --------------------------------------------- privilege escalation - */

  public function test_an_admin_cannot_grant_or_manage_super_admin(): void
  {
    $admin = $this->createUser('an_admin', ['admin']);
    $superRole = Role::where('name', 'super-admin')->firstOrFail();
    $super = $this->createUser('a_super', ['super-admin']);

    $this->actingWith($admin)->postJson("/api/user/{$admin->id}/role/{$superRole->id}")->assertForbidden();
    $this->actingWith($admin)->postJson("/api/role/{$superRole->id}/user/{$admin->id}")->assertForbidden();
    $this->actingWith($admin)->deleteJson("/api/user/{$super->id}/role/{$superRole->id}")->assertForbidden();
    $this->actingWith($admin)->deleteJson("/api/user/{$super->id}")->assertForbidden();

    $permission = Permission::where('name', 'app.view')->firstOrFail();
    $this->actingWith($admin)->deleteJson("/api/role/{$superRole->id}/permission/{$permission->id}")->assertForbidden();

    $admin->refresh();
    $this->assertFalse($admin->hasRole('super-admin'));
    $this->assertNotNull(User::find($super->id));

    # A super-admin still can.
    $this->actingWith($super)->postJson("/api/user/{$admin->id}/role/{$superRole->id}")->assertOk();
  }

  public function test_nobody_can_delete_their_own_account(): void
  {
    $admin = $this->createUser('an_admin', ['admin']);

    $this->actingWith($admin)->deleteJson("/api/user/{$admin->id}")->assertStatus(400);
    $this->assertNotNull(User::find($admin->id));
  }

  public function test_a_user_cannot_edit_or_delete_someone_elses_review(): void
  {
    [$app] = $this->makeVersion();
    $owner = $this->createUser('review_owner', ['user']);
    $other = $this->createUser('review_other', ['user']);

    $review = Review::create([
      'app_id' => $app->id, 'user_id' => $owner->id, 'rating' => 5, 'status' => 'published',
    ]);

    $this->actingWith($other)->putJson("/api/app/{$app->id}/review/{$review->id}", ['rating' => 1])->assertForbidden();
    $this->actingWith($other)->deleteJson("/api/app/{$app->id}/review/{$review->id}")->assertForbidden();
    $this->assertSame(5, (int) $review->fresh()->rating);

    $this->actingWith($owner)->putJson("/api/app/{$app->id}/review/{$review->id}", ['rating' => 4])->assertOk();
    $this->assertSame(4, (int) $review->fresh()->rating);

    # The review must belong to the app in the URL.
    $otherApp = App::factory()->create();
    $this->actingWith($owner)->putJson("/api/app/{$otherApp->id}/review/{$review->id}", ['rating' => 3])->assertForbidden();
  }

  /* ------------------------------------------------------ tokens ------ */

  public function test_a_token_in_the_query_string_is_not_accepted(): void
  {
    $token = $this->createUser('query_user', ['user'])->createToken('test')->plainTextToken;

    $this->getJson('/api/auth/me?token=' . urlencode($token))->assertUnauthorized();
  }

  public function test_login_is_rate_limited(): void
  {
    for ($i = 0; $i < 5; $i++)
      $this->postJson('/api/auth/login', ['login' => 'test_user', 'password' => 'wrong'])->assertStatus(400);

    $this->postJson('/api/auth/login', ['login' => 'test_user', 'password' => 'wrong'])->assertStatus(429);
  }

  public function test_list_page_size_is_capped(): void
  {
    $this->withHeaders($this->authHeaders())
      ->getJson('/api/app?page=1&pageSize=100000')
      ->assertStatus(400);
  }

  /* ---------------------------------------------------------- OTA ----- */

  public function test_an_unknown_package_registers_no_device(): void
  {
    $this->withHeaders([
      'X-Device-Info' => 'did=attacker-device;mf=X',
      'API-KEY'       => 'anything',
    ])->postJson('/ota-client/v1/app/info', [
      'package' => 'com.does.not.exist',
      'version' => '1.0.0',
      'bundle'  => '0.0.1',
    ])->assertStatus(400)->assertJsonPath('errors.package', 'Invalid package name');

    $this->assertSame(0, Device::count());
  }
}
