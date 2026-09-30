<?php

namespace App\Providers;

use App\Auth\QueryOrHeaderSanctumGuard;
use App\Models\PersonalAccessToken;
use Illuminate\Support\Facades\Auth;
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
