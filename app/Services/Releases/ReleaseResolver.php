<?php

namespace App\Services\Releases;

use App\Models\App;
use App\Models\Bundle;
use App\Models\Device;
use App\Models\Version;

/**
 * Picks the version / bundle a given device should run.
 *
 * Every device follows the public pointer (`latest_id`). A device that passes
 * `DemoAccess` also sees the demo pointer (`demo_latest_id`) and gets whichever
 * of the two is newer, so a public hotfix published after a demo still reaches
 * testers instead of leaving them on a stale demo.
 */
class ReleaseResolver
{
  /**
   * @param string|null $platform Expo platform (`android` / `ios`); only bundles
   *   shipping for it are considered. Null for `ota-client` archives.
   */
  public static function bundleFor(Version $version, ?Device $device, ?string $platform = null): ?Bundle
  {
    $candidates = [$version->latest];

    if ($version->demo_latest_id && DemoAccess::allows($device, $version->app))
      $candidates[] = $version->demoLatest;

    $candidates = array_filter($candidates, function (?Bundle $bundle) use ($platform) {
      if (!$bundle) return false;

      return $platform === null || $bundle->hasPlatform($platform);
    });

    return self::newest($candidates);
  }

  public static function versionFor(App $app, ?Device $device): ?Version
  {
    $candidates = [$app->latest];

    if ($app->demo_latest_id && DemoAccess::allows($device, $app))
      $candidates[] = $app->demoLatest;

    return self::newest(array_filter($candidates));
  }

  /**
   * True when `$item` is a demo the device may not see. Used by the artifact
   * download routes, so an API key alone never fetches an unpromoted demo.
   */
  public static function isHiddenDemo(Bundle|Version $item, ?Device $device): bool
  {
    if (!$item->is_demo) return false;

    $app = $item instanceof Version ? $item->app : $item->version?->app;

    return !$app || !DemoAccess::allows($device, $app);
  }

  /** True when `$a` was created after `$b`; the higher id breaks ties. */
  public static function isNewer(Bundle|Version $a, Bundle|Version $b): bool
  {
    return $a->created_at > $b->created_at
      || ($a->created_at == $b->created_at && $a->id > $b->id);
  }

  private static function newest(array $items): mixed
  {
    $best = null;

    foreach ($items as $item) {
      if ($best === null || self::isNewer($item, $best)) $best = $item;
    }

    return $best;
  }
}
