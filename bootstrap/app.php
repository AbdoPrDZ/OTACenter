<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
  ->withRouting(
    web: __DIR__ . '/../routes/web.php',
    // api: __DIR__ . '/../routes/api.php',
    commands: __DIR__ . '/../routes/console.php',
    channels: __DIR__ . '/../routes/channels.php',
    health: '/up',
    then: function (): void {
      Route::middleware('ota-client')->prefix('ota-client')->group(function () {
        require __DIR__ . '/../routes/ota_client.php';
      });
    }
  )
  ->withMiddleware(function (Middleware $middleware): void {
    $middleware->alias([
      'auth'               => \App\Http\Middleware\Authenticate::class,
      'auth.basic'         => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class,
      'cache.headers'      => \Illuminate\Http\Middleware\SetCacheHeaders::class,
      'can'                => \Illuminate\Auth\Middleware\Authorize::class,
      'guest'              => \App\Http\Middleware\RedirectIfAuthenticated::class,
      'password.confirm'   => \Illuminate\Auth\Middleware\RequirePassword::class,
      'signed'             => \Illuminate\Routing\Middleware\ValidateSignature::class,
      'throttle'           => \Illuminate\Routing\Middleware\ThrottleRequests::class,
      // 'verified'           => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,
      'session'            => \Illuminate\Session\Middleware\StartSession::class,
      'abilities'          => \Laravel\Sanctum\Http\Middleware\CheckAbilities::class,
      'ability'            => \Laravel\Sanctum\Http\Middleware\CheckForAnyAbility::class,
      'file.access'        => \App\Http\Middleware\FileAccessMiddleware::class,
      'role'               => \App\Http\Middleware\RoleMiddleware::class,
      'permission'         => \App\Http\Middleware\PermissionMiddleware::class,
      'rec.parent'         => \App\Http\Middleware\EnsureParentChild::class,
      'device'             => \App\Http\Middleware\DeviceMiddleware::class,
      'ota.api_key'        => \App\Http\Middleware\OtaApiKeyMiddleware::class,
      'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
    ]);
    $middleware->group('web', [
      \App\Http\Middleware\EncryptCookies::class,
      \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
      \Illuminate\Session\Middleware\StartSession::class,
      \Illuminate\View\Middleware\ShareErrorsFromSession::class,
      \App\Http\Middleware\VerifyCsrfToken::class,
      \Illuminate\Routing\Middleware\SubstituteBindings::class,
    ]);
    $middleware->group('api', [
      \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
      'throttle:api',
      \Illuminate\Routing\Middleware\SubstituteBindings::class,
      // \App\Http\Middleware\VerifyCsrfToken::class,
    ]);
    $middleware->group('ota-client', [
      \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
      'throttle:api',
      \Illuminate\Routing\Middleware\SubstituteBindings::class,
      // \App\Http\Middleware\VerifyCsrfToken::class,
      // DeviceMiddleware is applied per-route, after the API key check, so a
      // caller without a valid key never registers a device.
    ]);
    //
  })
  ->withExceptions(function (Exceptions $exceptions): void {
    $exceptions->shouldRenderJsonWhen(
      fn(Request $request) => $request->is('api/*'),
    );
  })->create();
