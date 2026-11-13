<?php

namespace App\Providers;

use App\Auth\QueryOrHeaderSanctumGuard;
use App\Models\PersonalAccessToken;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
  /**
   * Register any application services.
   */
  public function register(): void
  {
    //
  }

  /**
   * Bootstrap any application services.
   */
  public function boot(): void
  {
    // Behind a TLS-terminating proxy the app itself is reached over plain http.
    // When the public address is https, generate https URLs (assets, download
    // links, signed Expo asset URLs) even if the proxy's forwarded headers are
    // not trusted. Mixed http/https asset URLs make the browser load the same
    // JS module twice, which breaks React (e.g. the docs pages).
    if (str_starts_with((string) config('app.url'), 'https://')) {
      URL::forceScheme('https');
    }

    Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);

    Auth::resolved(function ($auth) {
      $auth->viaRequest('sanctum', function ($request) use ($auth) {
        return (new QueryOrHeaderSanctumGuard(
          auth: $auth,
          expiration: config('sanctum.expiration'),
          // provider: $config['provider'],
          trackLastUsedAt: config('sanctum.last_used_at', true)
        ))($request);
      });
    });
  }
}
