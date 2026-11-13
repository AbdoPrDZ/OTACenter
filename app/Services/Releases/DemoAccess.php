<?php

namespace App\Services\Releases;

use App\Models\App;
use App\Models\Device;
use App\Models\Domain;

/**
 * Decides whether a device may receive demo releases of an app.
 *
 * A device qualifies when it is linked to a user who belongs to a domain that
 * has `allow_demo` enabled and is bound to the app. Roles grant nothing here:
 * an admin who wants demos joins such a domain like everyone else.
 */
class DemoAccess
{
  public static function allows(?Device $device, App $app): bool
  {
    if (!$device || !$device->user_id) return false;

    return Domain::query()
      ->where('allow_demo', true)
      ->whereHas('users', fn ($q) => $q->where('users.id', $device->user_id))
      ->whereHas('apps', fn ($q) => $q->where('apps.id', $app->id))
      ->exists();
  }
}
