<?php

namespace App\Services\Releases;

use App\Models\App;
use App\Models\Bundle;
use App\Models\Log;
use App\Models\Version;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Moves the public and demo release pointers.
 *
 * | pointer                  | who follows it                       |
 * | ------------------------ | ------------------------------------ |
 * | `apps.latest_id`         | every device (public version)        |
 * | `apps.demo_latest_id`    | devices passing `DemoAccess`         |
 * | `versions.latest_id`     | every device (public bundle)         |
 * | `versions.demo_latest_id`| devices passing `DemoAccess`         |
 *
 * Publishing a demo item publicly *is* its promotion: the same row and files
 * become public (`is_demo = false`, `promoted_at` set), so testers who already
 * run it download nothing again.
 */
class ReleasePublisher
{
  /* ------------------------------ bundles ------------------------------ */

  public static function publishBundle(Version $version, Bundle $bundle): void
  {
    DB::transaction(function () use ($version, $bundle) {
      $wasDemo = $bundle->is_demo;

      if ($wasDemo) $bundle->update(['is_demo' => false, 'promoted_at' => now()]);

      $version->update([
        'latest_id'      => $bundle->id,
        'demo_latest_id' => $version->demo_latest_id == $bundle->id ? null : $version->demo_latest_id,
      ]);

      $event = $wasDemo ? 'bundle.promoted' : 'bundle.activated';
      $label = $wasDemo ? 'promoted to public' : 'activated';
      self::log($event, "Bundle {$bundle->name} $label", [$bundle, $version, $version->app]);
    });
  }

  /** Called when `versions.latest_id` was set through a generic update. */
  public static function bundlePublished(Version $version, Bundle $bundle): void
  {
    if (!$bundle->is_demo && $version->demo_latest_id != $bundle->id) return;

    self::publishBundle($version, $bundle);
  }

  /** @throws \DomainException when the bundle is already the public one */
  public static function publishDemoBundle(Version $version, Bundle $bundle): void
  {
    if ($version->latest_id == $bundle->id)
      throw new \DomainException('This bundle is already the public release.');

    DB::transaction(function () use ($version, $bundle) {
      $bundle->update(['is_demo' => true, 'promoted_at' => null]);
      $version->update(['demo_latest_id' => $bundle->id]);

      self::log('bundle.demo_activated', "Bundle {$bundle->name} published as a demo", [$bundle, $version, $version->app]);
    });
  }

  /** @return bool false when the version had no demo bundle */
  public static function withdrawDemoBundle(Version $version): bool
  {
    $bundle = $version->demoLatest;
    if (!$bundle) return false;

    $version->update(['demo_latest_id' => null]);
    self::log('bundle.demo_withdrawn', "Demo bundle {$bundle->name} withdrawn", [$bundle, $version, $version->app]);

    return true;
  }

  /* ------------------------------ versions ----------------------------- */

  public static function publishVersion(App $app, Version $version): void
  {
    DB::transaction(function () use ($app, $version) {
      $wasDemo = $version->is_demo;

      $version->update([
        'status' => 'published',
        ...($wasDemo ? ['is_demo' => false, 'promoted_at' => now()] : []),
      ]);

      $app->update([
        'latest_id'      => $version->id,
        'demo_latest_id' => $app->demo_latest_id == $version->id ? null : $app->demo_latest_id,
      ]);

      $event = $wasDemo ? 'version.promoted' : 'version.activated';
      $label = $wasDemo ? 'promoted to public' : 'activated';
      self::log($event, "Version {$version->name} $label", [$version, $app]);
    });
  }

  /** Called when `apps.latest_id` was set through a generic update. */
  public static function versionPublished(App $app, Version $version): void
  {
    if (!$version->is_demo && $app->demo_latest_id != $version->id) return;

    self::publishVersion($app, $version);
  }

  /** @throws \DomainException when the version is already the public one */
  public static function publishDemoVersion(App $app, Version $version): void
  {
    if ($app->latest_id == $version->id)
      throw new \DomainException('This version is already the public release.');

    DB::transaction(function () use ($app, $version) {
      $version->update(['is_demo' => true, 'promoted_at' => null]);
      $app->update(['demo_latest_id' => $version->id]);

      self::log('version.demo_activated', "Version {$version->name} published as a demo", [$version, $app]);
    });
  }

  /** @return bool false when the app had no demo version */
  public static function withdrawDemoVersion(App $app): bool
  {
    $version = $app->demoLatest;
    if (!$version) return false;

    $app->update(['demo_latest_id' => null]);
    self::log('version.demo_withdrawn', "Demo version {$version->name} withdrawn", [$version, $app]);

    return true;
  }

  private static function log(string $event, string $message, array $holders): void
  {
    Log::record($event, $message, array_values(array_filter([...$holders, Auth::user()])));
  }
}
