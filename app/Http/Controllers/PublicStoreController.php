<?php

namespace App\Http\Controllers;

use App\Models\App;
use App\Models\Domain;
use App\Models\DownloadHistory;
use App\Models\Log;
use App\Models\Review;
use App\Models\Version;
use App\Src\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * The public app store. Unauthenticated: it only ever exposes apps bound to a
 * domain flagged `is_public` that also have a published version.
 *
 * It builds its own response shapes on purpose — `App::toArray()` and
 * `Version::toArray()` include privileged fields (api_key, file_id, path)
 * whose branch is selected for every request, so they must not be reused here.
 */
class PublicStoreController extends Controller
{
  /** Pages listing every app from the public domains. */
  public function index(Request $request)
  {
    $request->mergeIfMissing(['page' => 1, 'pageSize' => 12]);

    $query = $this->publicAppsQuery();

    if ($request->filled('domain')) {
      $domainId = (int) $request->query('domain');

      $query->whereHas('domains', fn ($q) => $q->where('domains.id', $domainId)->where('is_public', true));
    }

    return App::tablingCollect(
      $request,
      load: [
        'logo',
        'domains',
        'latest',
        'versions' => fn ($q) => $q->where('status', 'published')->orderByDesc('id'),
      ],
      query: $query,
      selects: ['apps.*'],
      rawSelects: $this->ratingSelects(),
      map: fn (App $app) => $this->card($app),
    );
  }

  /** The public domains, for the store's filter. */
  public function domains()
  {
    $domains = Domain::query()
      ->where('is_public', true)
      ->whereHas('apps', fn ($q) => $this->constrainPublished($q))
      ->withCount(['apps' => fn ($q) => $this->constrainPublished($q)])
      ->orderBy('name')
      ->get()
      ->map(fn (Domain $domain) => [
        'id'         => $domain->id,
        'name'       => $domain->name,
        'apps_count' => $domain->apps_count,
      ]);

    return $this->apiSuccessResponse("Domains retrieved successfully", [
      'items' => $domains,
    ]);
  }

  public function show(App $app)
  {
    if (!$this->isPublic($app))
      return $this->apiErrorResponse("App not found", [], 404);

    $app->load([
      'logo',
      'domains',
      'screenshots',
      'latest',
      'versions' => fn ($q) => $q->where('status', 'published')->orderByDesc('id'),
    ]);

    $app->loadAvg(['reviews' => fn ($q) => $q->where('status', 'published')], 'rating');
    $app->loadCount(['reviews' => fn ($q) => $q->where('status', 'published')]);
    $app->load([
      'reviews' => fn ($q) => $q->where('status', 'published')->with('user')->orderByDesc('id')->limit(20),
    ]);

    return $this->apiSuccessResponse("App retrieved successfully", [
      'item' => [
        ...$this->card($app),
        'description' => $app->description,
        'screenshots' => $app->screenshots
          ->map(fn ($file) => $file->url)
          ->values(),
        'versions' => $app->versions
          ->map(fn (Version $version) => [
            'id'         => $version->id,
            'name'       => $version->name,
            'changelog'  => $version->changelog,
            'size'       => $this->fileSize($version),
            'created_at' => $version->created_at?->toIso8601String(),
          ])
          ->values(),
        'reviews' => $app->reviews
          ->map(fn ($review) => [
            'id'         => $review->id,
            'rating'     => (int) $review->rating,
            'title'      => $review->title,
            'comment'    => $review->comment,
            'user'       => $review->user ? [
              'name'      => $review->user->name,
              'image_url' => $review->user->image_url,
            ] : null,
            'created_at' => $review->created_at?->toIso8601String(),
          ])
          ->values(),
        'download_url' => url("/api/public/apps/{$app->id}/download"),
      ],
    ]);
  }

  /** Paginated published reviews for one public app. */
  public function reviews(Request $request, App $app)
  {
    if (!$this->isPublic($app))
      return $this->apiErrorResponse("App not found", [], 404);

    $request->mergeIfMissing(['page' => 1, 'pageSize' => 20]);

    return Review::tablingCollect(
      $request,
      load: ['user'],
      selects: ['reviews.*'],
      query: Review::query()->where('app_id', $app->id)->where('status', 'published'),
    );
  }

  public function download(App $app)  {
    if (!$this->isPublic($app))
      return $this->apiErrorResponse("App not found", [], 404);

    $version = $this->installableVersion($app);

    if (!$version)
      return $this->apiErrorResponse("This app has no published version", [], 404);

    $file = $version->file;

    if (!$file || !Storage::disk('public')->exists($file->path))
      return $this->apiErrorResponse("Installer file not found", [], 404);

    DownloadHistory::create([
      'device_id'   => null,
      'user_id'     => null,
      'target_type' => Version::class,
      'target_id'   => $version->id,
    ]);

    Log::record(
      'download',
      "Downloaded {$app->name} {$version->name}",
      [$app, $version],
      ['version' => $version->name],
    );

    return response()->download(
      Storage::disk('public')->path($file->path),
      "{$app->package_name}-{$version->name}.apk",
    );
  }

  /* ---------------------------------------------------------------- */

  /** Apps that sit in a public domain and have something published. */
  private function publicAppsQuery()
  {
    return App::query()
      ->whereHas('domains', fn ($q) => $q->where('is_public', true))
      ->whereHas('versions', fn ($q) => $q->where('status', 'published'))
      ->orderBy('name');
  }

  private function constrainPublished($query)
  {
    return $query->whereHas('versions', fn ($q) => $q->where('status', 'published'));
  }

  private function isPublic(App $app): bool
  {
    return $app->domains()->where('is_public', true)->exists()
      && $app->versions()->where('status', 'published')->exists();
  }

  /** The version the install button serves: the app's latest when published, else the newest published. */
  private function installableVersion(App $app): ?Version
  {
    $latest = $app->latest;

    if ($latest && $latest->status === 'published')
      return $latest;

    // In index/show the published versions are already eager-loaded (newest first).
    if ($app->relationLoaded('versions'))
      return $app->versions->first();

    return $app->versions()
      ->where('status', 'published')
      ->orderByDesc('id')
      ->first();
  }

  private function card(App $app): array
  {
    $version = $this->installableVersion($app);

    return [
      'id'         => $app->id,
      'name'       => $app->name,
      'package_name' => $app->package_name,
      'summary'    => $app->summary,
      'logo_url'   => $app->logo_url,
      'domains'    => $app->domains
        ->where('is_public', true)
        ->map(fn (Domain $domain) => ['id' => $domain->id, 'name' => $domain->name])
        ->values(),
      'version'    => $version?->name,
      'updated_at' => $version?->created_at?->toIso8601String(),
      'rating_avg'   => $app->reviews_avg_rating !== null ? (float) $app->reviews_avg_rating : null,
      'rating_count' => (int) ($app->reviews_count ?? 0),
    ];
  }

  /** Correlated sub-selects for the review aggregate (Tabling overwrites `select`). */
  private function ratingSelects(): array
  {
    return [
      'reviews_avg_rating' => "(select round(avg(rating), 1) from reviews where reviews.app_id = apps.id and reviews.status = 'published' and reviews.deleted_at is null)",
      'reviews_count'      => "(select count(*) from reviews where reviews.app_id = apps.id and reviews.status = 'published' and reviews.deleted_at is null)",
    ];
  }

  private function fileSize(Version $version): ?int
  {
    $file = $version->file;

    if (!$file || !Storage::disk('public')->exists($file->path))
      return null;

    return Storage::disk('public')->size($file->path);
  }
}
