<?php

namespace Tests\Feature\Rbac;

use App\Models\App;
use App\Models\AppScreenshot;
use App\Models\Bundle;
use App\Models\Domain;
use App\Models\File;
use App\Models\Role;
use App\Models\Version;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class RoleAccessTest extends TestCase
{
  /**
   * Role x endpoint matrix. Each row:
   * [role, method, uri, expectedStatus, payload]
   *
   * Permissions derive from SecuritySeeder. super-admin bypasses all checks.
   */
  public static function accessMatrix(): array
  {
    return [
      // ---- domain.view ----
      'user can list domains'              => ['user', 'getJson', '/api/domain', 200, []],
      'guest cannot list domains'          => ['guest', 'getJson', '/api/domain', 403, []],
      'user can view a domain'             => ['user', 'getJson', '/api/domain/{domain}', 200, []],
      'guest cannot view a domain'         => ['guest', 'getJson', '/api/domain/{domain}', 403, []],

      // ---- domain.create / update / delete ----
      'admin can create domain'            => ['admin', 'postJson', '/api/domain', 200, ['name' => 'role-domain']],
      'developer cannot create domain'     => ['developer', 'postJson', '/api/domain', 403, ['name' => 'role-domain']],
      'admin can update domain'            => ['admin', 'putJson', '/api/domain/{domain}', 200, ['description' => 'updated']],
      'developer cannot update domain'     => ['developer', 'putJson', '/api/domain/{domain}', 403, ['description' => 'updated']],
      'admin can delete domain'            => ['admin', 'deleteJson', '/api/domain/{domain}', 200, []],
      'developer cannot delete domain'     => ['developer', 'deleteJson', '/api/domain/{domain}', 403, []],

      // ---- user.view / user.delete ----
      'admin can list users'               => ['admin', 'getJson', '/api/user', 200, []],
      'developer cannot list users'        => ['developer', 'getJson', '/api/user', 403, []],
      'admin can view a user'              => ['admin', 'getJson', '/api/user/{user}', 200, []],
      'guest cannot view a user'           => ['guest', 'getJson', '/api/user/{user}', 403, []],
      'admin can delete a user'            => ['admin', 'deleteJson', '/api/user/{user}', 200, []],
      'developer cannot delete a user'     => ['developer', 'deleteJson', '/api/user/{user}', 403, []],

      // ---- app.view ----
      'user can list apps'                 => ['user', 'getJson', '/api/app', 200, []],
      'guest cannot list apps'             => ['guest', 'getJson', '/api/app', 403, []],
      'user can view an app'               => ['user', 'getJson', '/api/app/{app}', 200, []],

      // ---- app.create / update / delete (admin-only) ----
      'admin can create app'               => ['admin', 'postJson', '/api/app', 200, ['name' => 'role-app', 'package_name' => 'role.app']],
      'developer cannot create app'        => ['developer', 'postJson', '/api/app', 403, ['name' => 'role-app', 'package_name' => 'role.app']],
      'admin can update app'               => ['admin', 'putJson', '/api/app/{app}', 200, ['name' => 'updated-app']],
      'developer cannot update app'        => ['developer', 'putJson', '/api/app/{app}', 403, ['name' => 'updated-app']],
      'admin can delete app'               => ['admin', 'deleteJson', '/api/app/{app}', 200, []],
      'developer cannot delete app'        => ['developer', 'deleteJson', '/api/app/{app}', 403, []],

      // ---- screenshot ----
      'user can list screenshots'          => ['user', 'getJson', '/api/app/{app}/screenshot', 200, []],
      'guest cannot list screenshots'      => ['guest', 'getJson', '/api/app/{app}/screenshot', 403, []],
      'developer can upload screenshot'    => ['developer', 'post', '/api/app/{app}/screenshot', 200, ['file' => 'png']],
      'user cannot upload screenshot'      => ['user', 'post', '/api/app/{app}/screenshot', 403, ['file' => 'png']],
      'admin can delete screenshot'        => ['admin', 'deleteJson', '/api/app/{app}/screenshot/{screenshot}', 200, []],
      'developer cannot delete screenshot' => ['developer', 'deleteJson', '/api/app/{app}/screenshot/{screenshot}', 403, []],

      // ---- version ----
      'user can list versions'             => ['user', 'getJson', '/api/app/{app}/version', 200, []],
      'guest cannot list versions'         => ['guest', 'getJson', '/api/app/{app}/version', 403, []],
      'developer can create version'       => ['developer', 'post', '/api/app/{app}/version', 200, ['name' => '2.0.0', 'changelog' => 'x', 'api_key' => 'role-api-key', 'file' => 'apk']],
      'user cannot create version'         => ['user', 'post', '/api/app/{app}/version', 403, ['name' => '2.0.0', 'changelog' => 'x', 'file' => 'apk']],
      'admin can delete version'           => ['admin', 'deleteJson', '/api/app/{app}/version/{version}', 200, []],
      'developer cannot delete version'    => ['developer', 'deleteJson', '/api/app/{app}/version/{version}', 403, []],

      // ---- bundle ----
      'user can list bundles'              => ['user', 'getJson', '/api/app/{app}/version/{version}/bundle', 200, []],
      'guest cannot list bundles'          => ['guest', 'getJson', '/api/app/{app}/version/{version}/bundle', 403, []],
      'developer can create bundle'        => ['developer', 'post', '/api/app/{app}/version/{version}/bundle', 200, ['name' => 'bundle-role', 'file' => 'zip']],
      'user cannot create bundle'          => ['user', 'post', '/api/app/{app}/version/{version}/bundle', 403, ['name' => 'bundle-role', 'file' => 'zip']],
      'admin can activate bundle'          => ['admin', 'postJson', '/api/app/{app}/version/{version}/bundle/{bundle}/activate', 200, []],
      'developer cannot activate bundle'   => ['developer', 'postJson', '/api/app/{app}/version/{version}/bundle/{bundle}/activate', 403, []],
      'admin can delete bundle'            => ['admin', 'deleteJson', '/api/app/{app}/version/{version}/bundle/{bundle}', 200, []],
      'developer cannot delete bundle'     => ['developer', 'deleteJson', '/api/app/{app}/version/{version}/bundle/{bundle}', 403, []],

      // ---- domain binding ----
      'admin can bind user to domain'      => ['admin', 'postJson', '/api/user/{user}/domain/{domain}', 200, []],
      'developer cannot bind user'         => ['developer', 'postJson', '/api/user/{user}/domain/{domain}', 403, []],
      'admin can unbind user from domain'  => ['admin', 'deleteJson', '/api/user/{user}/domain/{domain}', 200, []],
      'admin can bind app to domain'       => ['admin', 'postJson', '/api/app/{app}/domain/{domain}', 200, []],
      'developer cannot bind app'          => ['developer', 'postJson', '/api/app/{app}/domain/{domain}', 403, []],
      'admin can unbind app from domain'   => ['admin', 'deleteJson', '/api/app/{app}/domain/{domain}', 200, []],

      // ---- role.view / role.attach / role.detach ----
      'admin can list roles'                   => ['admin', 'getJson', '/api/role', 200, []],
      'developer cannot list roles'            => ['developer', 'getJson', '/api/role', 403, []],
      'admin can view a role'                  => ['admin', 'getJson', '/api/role/{role}', 200, []],
      'user cannot view a role'                => ['user', 'getJson', '/api/role/{role}', 403, []],
      'admin can list role users'              => ['admin', 'getJson', '/api/role/{role}/user', 200, []],
      'guest cannot list role users'           => ['guest', 'getJson', '/api/role/{role}/user', 403, []],
      'admin can attach user to role'          => ['admin', 'postJson', '/api/role/{role}/user/{user}', 200, []],
      'developer cannot attach user to role'   => ['developer', 'postJson', '/api/role/{role}/user/{user}', 403, []],
      'developer cannot detach user from role' => ['developer', 'deleteJson', '/api/role/{role}/user/{user}', 403, []],

      // ---- super-admin bypass ----
      'super-admin can create app'         => ['super-admin', 'postJson', '/api/app', 200, ['name' => 'sa-app', 'package_name' => 'sa.app']],
      'super-admin can delete domain'      => ['super-admin', 'deleteJson', '/api/domain/{domain}', 200, []],
    ];
  }

  #[DataProvider('accessMatrix')]
  public function test_role_access(string $role, string $method, string $uri, int $status, array $payload): void
  {
    Storage::fake('public');
    [$app, $version, $bundle, $screenshot, $domain, $targetUser, $developerRole] = $this->seedFixtures();

    $uri = str_replace(
      ['{app}', '{version}', '{bundle}', '{screenshot}', '{domain}', '{user}', '{role}'],
      [$app->id, $version->id, $bundle->id, $screenshot->id, $domain->id, $targetUser->id, $developerRole->id],
      $uri
    );

    foreach ($payload as $key => $value) {
      if (in_array($key, ['file', 'screenshot']) && is_string($value)) {
        $payload[$key] = $this->fakeUpload($value);
      }
    }

    $headers = $this->headersFor($this->createUser('role_' . $role, [$role]));

    $response = in_array($method, ['postJson', 'putJson', 'deleteJson'], true)
      ? $this->withHeaders($headers)->{$method}($uri, $payload)
      : ($method === 'post'
          ? $this->withHeaders($headers)->post($uri, $payload)
          : $this->withHeaders($headers)->{$method}($uri));

    $response->assertStatus($status);
  }

  private function seedFixtures(): array
  {
    $app = App::factory()->create();

    $file = File::create(['name' => 'version-file-' . uniqid(), 'disk' => 'public', 'path' => 'versions/v.png']);
    $version = Version::create([
      'name' => '1.0.0',
      'changelog' => 'Initial',
      'app_id' => $app->id,
      'status' => 'draft',
      'file_id' => $file->name,
    ]);

    $bundleFile = File::create(['name' => 'bundle-file-' . uniqid(), 'disk' => 'public', 'path' => 'bundles/b.zip']);
    $bundle = Bundle::create([
      'version_id' => $version->id,
      'name' => 'bundle-fixture',
      'file_id' => $bundleFile->name,
    ]);

    $shotFile = File::create(['name' => 'shot-file-' . uniqid(), 'disk' => 'public', 'path' => 'screenshots/s.png']);
    $screenshot = AppScreenshot::create(['app_id' => $app->id, 'file_id' => $shotFile->name]);

    $domain = Domain::create(['name' => 'fixture.example']);
    $targetUser = $this->createUser('target_user_' . uniqid());
    $role = Role::where('name', 'developer')->firstOrFail();

    return [$app, $version, $bundle, $screenshot, $domain, $targetUser, $role];
  }

  private function fakeUpload(string $ext): UploadedFile
  {
    $tempFile = tempnam(sys_get_temp_dir(), 'upload');

    $contents = match ($ext) {
      'png' => base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='),
      'apk' => 'fake-apk-content',
      default => 'fake-zip-content',
    };

    $mime = match ($ext) {
      'png' => 'image/png',
      'apk' => 'application/vnd.android.package-archive',
      default => 'application/zip',
    };

    file_put_contents($tempFile, $contents);

    return new UploadedFile(
      $tempFile,
      'file.' . $ext,
      $mime,
      null,
      true
    );
  }
}
