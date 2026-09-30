<?php

namespace Database\Seeders;

use App\Models\App;
use App\Models\File;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class TestAppSeeder extends Seeder
{
  /**
   * Run the database seeds.
   */
  public function run(): void
  {
    $v1version_file_name = 'ota-client-1.0.0.apk';
    $v1version_file_path = "defaults/$v1version_file_name";
    if (!Storage::disk('public')->exists($v1version_file_path))
      throw new \Exception("Version file not found at path: $v1version_file_path. Please ensure the file exists in the public storage.");

    $v1b2bundle_file_name = 'ota-client-1.0.0-0.0.2.tar.gz';
    $v1b2bundle_file_path = "defaults/$v1b2bundle_file_name";
    if (!Storage::disk('public')->exists($v1b2bundle_file_path))
      throw new \Exception("Bundle file not found at path: $v1b2bundle_file_path. Please ensure the file exists in the public storage.");

    $v2version_file_name = 'ota-client-2.0.0.apk';
    $v2version_file_path = "defaults/$v2version_file_name";
    if (!Storage::disk('public')->exists($v2version_file_path))
      throw new \Exception("Version file not found at path: $v2version_file_path. Please ensure the file exists in the public storage.");

    $v2b2bundle_file_name = 'ota-client-2.0.0-0.0.2.tar.gz';
    $v2b2bundle_file_path = "defaults/$v2b2bundle_file_name";
    if (!Storage::disk('public')->exists($v2b2bundle_file_path))
      throw new \Exception("Bundle file not found at path: $v2b2bundle_file_path. Please ensure the file exists in the public storage.");

    $app = App::create([
      'name'         => 'OTA Client',
      'package_name' => 'com.otaclient',
      'summary'      => 'OTA Client for testing',
      'description'  => 'This is a test OTA Client application for testing purposes.',
      'latest_id'    => null,
    ]);

    $v1version_file = File::create([
      'name' => $v1version_file_name,
      'path' => $v1version_file_path,
    ]);
    $v1version = $app->versions()->create([
      'name'                   => '1.0.0',
      'changelog'              => 'Initial release',
      'status'                 => 'published',
      'file_id'                => $v1version_file->name,
      'api_key'                => 'test-api-key',
      'default_bundle_version' => '0.0.1',
      'latest_id'              => null,
    ]);

    $v1b2bundle_file = File::create([
      'name' => $v1b2bundle_file_name,
      'path' => $v1b2bundle_file_path,
    ]);
    $v1b2bundle = $v1version->bundles()->create([
      'name'      => '0.0.2',
      'changelog' => 'Test New bundle',
      'status'    => 'published',
      'file_id'   => $v1b2bundle_file->name,
    ]);

    $v2version_file = File::create([
      'name' => $v2version_file_name,
      'path' => $v2version_file_path,
    ]);
    $v2version = $app->versions()->create([
      'name'                   => '2.0.0',
      'changelog'              => 'Second release',
      'status'                 => 'draft',
      'file_id'                => $v2version_file->name,
      'api_key'                => 'test-api-key',
      'default_bundle_version' => '0.0.1',
      'latest_id'              => null,
    ]);
    $v1version->latest_id = $v1b2bundle->id;
    $v1version->save();

    $app->latest_id = $v1version->id;
    $app->save();

    $v2b2bundle_file = File::create([
      'name' => $v2b2bundle_file_name,
      'path' => $v2b2bundle_file_path,
    ]);
    $v2b2bundle = $v2version->bundles()->create([
      'name'      => '0.0.2',
      'changelog' => 'Test New bundle',
      'status'    => 'draft',
      'file_id'   => $v2b2bundle_file->name,
    ]);

    $v2version->latest_id = $v2b2bundle->id;
    $v2version->save();
  }
}
