<?php

namespace App\Http\Middleware;

use App\Models\App;
use App\Models\Bundle;
use App\Models\Version;
use App\Src\Controller;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authorizes the device-facing OTA API with the app version's API key.
 *
 * No login session is involved: a client holding the correct `API-KEY` for the
 * version may check for updates and download its artifacts. Routes that carry
 * the artifact (…/update/version/{version}, …/update/bundle/{bundle}) are
 * validated here against the bound model. /app/info names the version in its
 * payload instead, so AppController::info() performs that comparison.
 */
class OtaApiKeyMiddleware
{
  /**
   * Handle an incoming request.
   *
   * @param  Closure(Request): (Response)  $next
   */
  public function handle(Request $request, Closure $next): Response
  {
    // The header is the normal path. `?api_key=` exists for URLs a browser
    // opens directly (the APK download link), where headers cannot be set.
    $provided = $request->header('API-KEY') ?: $request->query('api_key');

    if (!is_string($provided) || $provided === '')
      return Controller::apiSingleErrorResponse('api_key', 'Missing API key', [], 401);

    $expected = $this->expectedKey($request);

    if ($expected === null)
      return $this->unresolvedResponse($request);

    if (!self::matches($expected, $provided))
      return Controller::apiSingleErrorResponse('api_key', 'Invalid API key', [], 401);

    $request->attributes->set('api_key', $provided);

    return $next($request);
  }

  private function unresolvedResponse(Request $request): Response
  {
    if ($request->route('version') !== null || $request->route('bundle') !== null)
      return Controller::apiSingleErrorResponse('api_key', 'Invalid API key', [], 401);

    if ($request->route('package') !== null)
      return Controller::apiSingleErrorResponse('package', 'Invalid package name', [], 404);

    $package = $request->input('package');
    $name    = $request->input('version');

    $errors = [];
    if (!is_string($package) || $package === '') $errors['package'] = 'The package field is required.';
    if (!is_string($name) || $name === '') $errors['version'] = 'The version field is required.';
    if ($errors) return Controller::apiInvalidValuesResponse($errors);

    if (!App::where('package_name', $package)->exists())
      return Controller::apiSingleErrorResponse('package', 'Invalid package name');

    return Controller::apiSingleErrorResponse('version', 'Invalid version');
  }

  /**
   * Constant-time comparison. A version without a usable key never authorizes.
   */
  public static function matches(?string $expected, ?string $provided): bool
  {
    return is_string($expected)
      && $expected !== ''
      && is_string($provided)
      && hash_equals($expected, $provided);
  }

  /**
   * The key expected by the route's artifact, or null when the request names no
   * resolvable version. /app/info carries the app and version in its payload
   * (there is no route parameter to bind), so that lookup happens here too —
   * before DeviceMiddleware registers a device for the caller.
   */
  private function expectedKey(Request $request): ?string
  {
    # Expo manifest: the package is in the path, the runtime in a protocol header.
    $package = $request->route('package');
    if ($package !== null) {
      $app = App::where('package_name', $package)->first();
      if (!$app) return null;

      $runtime = $request->header('expo-runtime-version') ?? $request->query('runtime-version');
      $version = is_string($runtime)
        ? Version::where('app_id', $app->id)->where('name', $runtime)->first()
        : null;

      # Same fallback as /app/info: an unlisted runtime is authorized by the current key.
      return $version?->api_key ?? $app->latest?->api_key;
    }

    $version = $request->route('version');
    if ($version !== null) {
      if (!$version instanceof Version) $version = Version::find($version);

      return $version?->api_key;
    }

    $bundle = $request->route('bundle');
    if ($bundle !== null) {
      if (!$bundle instanceof Bundle) $bundle = Bundle::find($bundle);

      return $bundle?->version?->api_key;
    }

    $package = $request->input('package');
    $name    = $request->input('version');

    if (!is_string($package) || !is_string($name)) return null;

    $app = App::where('package_name', $package)->first();
    if (!$app) return null;

    $version = Version::where('app_id', $app->id)->where('name', $name)->first();

    # Same fallback as AppController::info(): a device on a build this server does
    # not list is authorized by the app's current version key, so the check can
    # still answer with the version update instead of "Invalid version".
    return $version?->api_key ?? $app->latest?->api_key;
  }
}
