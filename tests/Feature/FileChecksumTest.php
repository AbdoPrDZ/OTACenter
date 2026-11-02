<?php

namespace Tests\Feature;

use App\Models\App;
use App\Models\File;
use App\Models\Version;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FileChecksumTest extends TestCase
{
  public function test_a_created_file_gets_the_sha256_of_its_content(): void
  {
    Storage::fake('public');
    Storage::disk('public')->put('apps/logo.png', 'logo-bytes');

    $file = File::create(['name' => 'logo-' . uniqid(), 'disk' => 'public', 'path' => 'apps/logo.png']);

    $this->assertSame(hash('sha256', 'logo-bytes'), $file->checksum);
    $this->assertSame(hash('sha256', 'logo-bytes'), $file->fresh()->checksum);
  }

  public function test_a_file_missing_on_disk_has_no_checksum(): void
  {
    Storage::fake('public');

    $file = File::create(['name' => 'ghost-' . uniqid(), 'disk' => 'public', 'path' => 'apps/missing.png']);

    $this->assertNull($file->checksum);
  }

  public function test_an_uploaded_version_file_gets_a_checksum(): void
  {
    Storage::fake('public');
    $app = App::factory()->create();

    $tmp = tempnam(sys_get_temp_dir(), 'apk');
    file_put_contents($tmp, 'apk-content');
    $upload = new UploadedFile($tmp, 'app.apk', 'application/vnd.android.package-archive', null, true);

    $this->withHeaders($this->authHeaders())
      ->post("/api/app/{$app->id}/version", [
        'name'      => '1.0.0',
        'changelog' => 'First',
        'api_key'   => 'key',
        'file'      => $upload,
      ], ['Accept' => 'application/json'])
      ->assertOk();

    $version = Version::where('app_id', $app->id)->firstOrFail();
    $this->assertSame(hash('sha256', 'apk-content'), $version->file->checksum);
  }

  public function test_the_migration_backfills_existing_files(): void
  {
    Storage::fake('public');
    Storage::disk('public')->put('versions/old.apk', 'old-apk');

    File::create(['name' => 'old-file', 'disk' => 'public', 'path' => 'versions/old.apk']);
    File::create(['name' => 'gone-file', 'disk' => 'public', 'path' => 'versions/gone.apk']);

    # Re-run the migration: down() drops the column, up() re-adds and backfills it.
    $migration = require database_path('migrations/2026_11_02_000001_add_checksum_to_files_table.php');
    $migration->down();
    $migration->up();

    $this->assertSame(hash('sha256', 'old-apk'), DB::table('files')->where('name', 'old-file')->value('checksum'));
    $this->assertNull(DB::table('files')->where('name', 'gone-file')->value('checksum'));
  }

  public function test_ota_check_and_download_advertise_the_checksum(): void
  {
    Storage::fake('public');
    Storage::disk('public')->put('versions/new.apk', 'new-apk');

    $app = App::factory()->create(['package_name' => 'com.example.checksum']);
    $oldFile = File::create(['name' => 'old-apk', 'disk' => 'public', 'path' => 'versions/old.apk']);
    Version::create([
      'app_id' => $app->id, 'name' => '1.0.0', 'changelog' => 'Old', 'status' => 'published', 'api_key' => 'k1',
      'file_id' => $oldFile->name, 'default_bundle_version' => '0.0.1',
    ]);
    $file = File::create(['name' => 'new-apk', 'disk' => 'public', 'path' => 'versions/new.apk']);
    $new = Version::create([
      'app_id' => $app->id, 'name' => '1.1.0', 'changelog' => 'New', 'status' => 'published',
      'api_key' => 'k2', 'file_id' => $file->name,
    ]);
    DB::table('apps')->where('id', $app->id)->update(['latest_id' => $new->id]);

    $headers = ['X-Device-Info' => 'did=checksum-device', 'API-KEY' => 'k1'];

    $this->withHeaders($headers)
      ->postJson('/ota-client/v1/app/info', ['package' => $app->package_name, 'version' => '1.0.0', 'bundle' => '0.0.1'])
      ->assertJsonPath('data.availableUpdates.version.checksum', hash('sha256', 'new-apk'));

    $this->withHeaders([...$headers, 'API-KEY' => 'k2'])
      ->get("/ota-client/v1/app/update/version/{$new->id}")
      ->assertOk()
      ->assertHeader('X-Checksum-SHA256', hash('sha256', 'new-apk'));
  }
}
