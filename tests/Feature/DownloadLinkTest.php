<?php

namespace Tests\Feature;

use App\Models\App;
use App\Models\Domain;
use App\Models\DownloadHistory;
use App\Models\DownloadLink;
use App\Models\File;
use App\Models\User;
use App\Models\Version;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DownloadLinkTest extends TestCase
{
  protected function setUp(): void
  {
    parent::setUp();

    Storage::fake('public');
  }

  /** Requests in one test switch users: drop the guard's cached user between them. */
  private function actingWith(User $user): static
  {
    $this->app['auth']->forgetGuards();

    return $this->withHeaders($this->headersFor($user));
  }

  private function anonymous(): static
  {
    $this->app['auth']->forgetGuards();

    return $this->withHeaders(['Authorization' => '']);
  }

  /** An app with a published, downloadable version; public when `$public`. */
  private function makeApp(bool $public = false): App
  {
    $app = App::factory()->create();

    Storage::disk('public')->put("versions/app-{$app->id}.apk", 'apk-bytes');
    $file = File::create(['name' => "apk-{$app->id}", 'disk' => 'public', 'path' => "versions/app-{$app->id}.apk"]);

    $version = Version::create([
      'app_id' => $app->id, 'name' => '1.0.0', 'changelog' => 'First', 'status' => 'published',
      'api_key' => 'key', 'file_id' => $file->name,
    ]);
    $app->update(['latest_id' => $version->id]);

    if ($public) {
      $domain = Domain::create(['name' => 'Public ' . $app->id, 'is_public' => true]);
      $app->domains()->attach($domain->id);
    }

    return $app;
  }

  /** The `?token=` value of a generated link URL. */
  private function tokenOf(string $url): string
  {
    parse_str(parse_url($url, PHP_URL_QUERY), $query);

    return $query['token'];
  }

  /* ------------------------------------------------------ dashboard -- */

  public function test_a_developer_creates_a_link_counted_for_themselves(): void
  {
    $app = $this->makeApp();
    $dev = $this->createUser('link_dev', ['developer']);

    $response = $this->actingWith($dev)
      ->postJson("/api/app/{$app->id}/download-link", ['label' => 'QA team', 'expires_in_days' => 7])
      ->assertOk()
      ->assertJsonPath('item.user.id', $dev->id)
      ->assertJsonPath('item.creator.id', $dev->id)
      ->assertJsonPath('item.label', 'QA team')
      ->assertJsonPath('item.status', 'active')
      ->assertJsonPath('item.downloads_count', 0);

    $this->assertStringContainsString("/download/{$app->id}?token=", $response->json('item.url'));

    # The plain token is never stored, only its hash (and an encrypted copy).
    $token = $this->tokenOf($response->json('item.url'));
    $this->assertDatabaseHas('download_links', ['token_hash' => hash('sha256', $token)]);
    $this->assertDatabaseMissing('download_links', ['token' => $token]);
  }

  public function test_only_users_who_can_view_users_create_links_for_someone_else(): void
  {
    $app = $this->makeApp();
    $dev = $this->createUser('link_dev', ['developer']);
    $admin = $this->createUser('link_admin', ['admin']);
    $target = $this->createUser('link_target', ['user']);

    $this->actingWith($dev)
      ->postJson("/api/app/{$app->id}/download-link", ['user_id' => $target->id])
      ->assertForbidden();

    $this->actingWith($admin)
      ->postJson("/api/app/{$app->id}/download-link", ['user_id' => $target->id])
      ->assertOk()
      ->assertJsonPath('item.user.id', $target->id)
      ->assertJsonPath('item.creator.id', $admin->id);
  }

  public function test_a_plain_user_cannot_manage_links(): void
  {
    $app = $this->makeApp();
    $user = $this->createUser('link_user', ['user']);

    $this->actingWith($user)->getJson("/api/app/{$app->id}/download-link?page=1")->assertForbidden();
    $this->actingWith($user)->postJson("/api/app/{$app->id}/download-link")->assertForbidden();
  }

  public function test_an_invalid_expiry_is_rejected(): void
  {
    $app = $this->makeApp();

    $this->withHeaders($this->authHeaders())
      ->postJson("/api/app/{$app->id}/download-link", ['expires_in_days' => 3])
      ->assertStatus(400);
  }

  /* ------------------------------------------------------- download -- */

  public function test_a_token_downloads_a_private_app_and_counts_for_its_user(): void
  {
    $app = $this->makeApp(public: false);
    $owner = $this->createUser('link_owner', ['user']);
    $link = DownloadLink::generate($app, $owner);

    $this->anonymous()
      ->get($link->url())
      ->assertOk()
      ->assertHeader('X-Checksum-SHA256', hash('sha256', 'apk-bytes'));

    $this->assertDatabaseHas('download_histories', [
      'user_id'          => $owner->id,
      'download_link_id' => $link->id,
      'target_type'      => Version::class,
      'target_id'        => $app->latest_id,
    ]);
    $this->assertNotNull($link->fresh()->last_used_at);
  }

  public function test_a_private_app_without_a_token_is_not_downloadable(): void
  {
    $app = $this->makeApp(public: false);

    $this->anonymous()->get("/download/{$app->id}")->assertNotFound();
    $this->assertSame(0, DownloadHistory::count());
  }

  public function test_a_public_app_downloads_without_a_token_as_anonymous(): void
  {
    $app = $this->makeApp(public: true);

    $this->anonymous()->get("/download/{$app->id}")->assertOk();

    $this->assertDatabaseHas('download_histories', ['user_id' => null, 'download_link_id' => null]);
  }

  public function test_a_token_only_works_for_its_own_app(): void
  {
    $app = $this->makeApp();
    $other = $this->makeApp();
    $link = DownloadLink::generate($app, $this->createUser('link_owner'));

    $this->anonymous()->get("/download/{$other->id}?token={$this->tokenOf($link->url())}")->assertNotFound();
    $this->anonymous()->get("/download/{$app->id}?token=not-a-real-token")->assertNotFound();
  }

  public function test_revoked_and_expired_links_stop_working(): void
  {
    $app = $this->makeApp();
    $owner = $this->createUser('link_owner');

    $revoked = DownloadLink::generate($app, $owner);
    $this->withHeaders($this->authHeaders())
      ->deleteJson("/api/app/{$app->id}/download-link/{$revoked->id}")
      ->assertOk()
      ->assertJsonPath('item.status', 'revoked');

    $expired = DownloadLink::generate($app, $owner, expiresAt: now()->subMinute());

    $this->anonymous()->get($revoked->fresh()->url())->assertStatus(410);
    $this->anonymous()->get($expired->url())->assertStatus(410);
    $this->assertSame(0, DownloadHistory::count());
  }

  /* ----------------------------------------------------- statistics -- */

  public function test_general_statistics_include_daily_downloads_and_top_apps(): void
  {
    $popular = $this->makeApp(public: true);
    $quiet = $this->makeApp(public: true);
    $link = DownloadLink::generate($popular, $this->createUser('link_owner'));

    $this->anonymous()->get($link->url())->assertOk();
    $this->anonymous()->get("/download/{$popular->id}")->assertOk();
    $this->anonymous()->get("/download/{$quiet->id}")->assertOk();

    $this->app['auth']->forgetGuards();
    $response = $this->withHeaders($this->authHeaders())
      ->getJson('/api/statistics/general')
      ->assertOk()
      ->assertJsonPath('statistics.downloads.total', 3)
      ->assertJsonPath('statistics.downloads.with_token', 1)
      ->assertJsonPath('statistics.downloads.top_apps.0.id', $popular->id)
      ->assertJsonPath('statistics.downloads.top_apps.0.downloads', 2)
      ->assertJsonPath('statistics.download_links.active', 1)
      ->assertJsonCount(30, 'statistics.downloads.daily');

    $today = collect($response->json('statistics.downloads.daily'))->last();
    $this->assertSame(now()->toDateString(), $today['date']);
    $this->assertSame(1, $today['with_token']);
    $this->assertSame(2, $today['without_token']);
  }

  public function test_statistics_split_downloads_with_and_without_token(): void
  {
    $app = $this->makeApp(public: true);
    $owner = $this->createUser('link_owner', ['user']);
    $link = DownloadLink::generate($app, $owner);

    $this->anonymous()->get($link->url())->assertOk();
    $this->anonymous()->get($link->url())->assertOk();
    $this->anonymous()->get("/download/{$app->id}")->assertOk();

    $this->app['auth']->forgetGuards();
    $this->withHeaders($this->authHeaders())
      ->getJson("/api/statistics/app/{$app->id}")
      ->assertOk()
      ->assertJsonPath('statistics.downloads.total', 3)
      ->assertJsonPath('statistics.downloads.with_token', 2)
      ->assertJsonPath('statistics.downloads.without_token', 1)
      ->assertJsonPath('statistics.top_downloaders.0.id', $owner->id)
      ->assertJsonPath('statistics.top_downloaders.0.downloads', 2)
      ->assertJsonPath('statistics.download_links.active', 1);

    $this->withHeaders($this->authHeaders())
      ->getJson("/api/statistics/user/{$owner->id}")
      ->assertOk()
      ->assertJsonPath('statistics.downloads.total', 2)
      ->assertJsonPath('statistics.downloads.with_token', 2);

    $this->withHeaders($this->authHeaders())
      ->getJson("/api/app/{$app->id}/download-link?page=1")
      ->assertOk()
      ->assertJsonPath('items.0.downloads_count', 2);
  }
}
