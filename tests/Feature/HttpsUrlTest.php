<?php

namespace Tests\Feature;

use App\Providers\AppServiceProvider;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

/**
 * Behind a TLS proxy the app is reached over plain http. An https APP_URL must
 * still produce https URLs, or the browser loads JS modules under two schemes
 * and runs them twice (the docs crashed with "Callout not defined").
 */
class HttpsUrlTest extends TestCase
{
  protected function tearDown(): void
  {
    URL::forceScheme(null);

    parent::tearDown();
  }

  private function bootWithAppUrl(string $url): void
  {
    config(['app.url' => $url]);
    (new AppServiceProvider($this->app))->boot();
  }

  public function test_an_https_app_url_forces_https_urls_on_a_plain_http_request(): void
  {
    $this->bootWithAppUrl('https://ota.example.com');

    $this->get('http://ota.example.com/docs')->assertOk();

    $this->assertStringStartsWith('https://', url('/build/assets/app.js'));
    $this->assertStringStartsWith('https://', asset('build/assets/app.js'));
  }

  public function test_an_http_app_url_leaves_the_scheme_alone(): void
  {
    $this->bootWithAppUrl('http://localhost:8000');

    $this->get('http://localhost/docs')->assertOk();

    $this->assertStringStartsWith('http://', url('/build/assets/app.js'));
  }
}
