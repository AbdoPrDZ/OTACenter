<?php

namespace App\Http\Controllers;

use App\Models\App;
use App\Models\Domain;
use App\Models\DownloadHistory;
use App\Models\Log;
use App\Models\Review;
use App\Models\User;
use App\Models\Version;
use App\Src\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * The authenticated (private) app store.
 *
 * It mirrors {@see PublicStoreController} but only ever exposes apps that are
 * bound to one of the caller's domains and have a published version, plus an
 * authenticated download that records a `DownloadHistory` row against the user.
 *
 * `super-admin` / `admin` / `developer` see the whole catalogue; everyone else
 * is scoped to their own domains. Shapes are built here on purpose — the model
 * `toArray()` methods include privileged fields (`api_key`, `file_id`, `path`)
 * that must never reach a non-privileged client.
 */
class StoreController extends Controller
{
  /** Pages listing every app the caller may access. */
  public function index(Request $request)
  {
    $request->mergeIfMissing(['page' => 1, 'pageSize' => 12]);

    /** @var User $user */
    $user = $request->user();
    $query = $this->scopedAppsQuery($user);

    if ($request->filled('domain')) {
      $domainId = (int) $request->query('domain');

      $query->whereHas('domains', fn ($q) => $q->where('domains.id', $domainId));
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

  public function show(Request $request, App $app)
  {
    /** @var User $user */
    $user = $request->user();

    if (!$this->isVisible($app, $user))
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
      'item' => $this->detail($app),
    ]);
  }

  /** Paginated published reviews for an app the caller may access. */
  public function reviews(Request $request, App $app)
  {
    /** @var User $user */
    $user = $request->user();

    if (!$this->isVisible($app, $user))
      return $this->apiErrorResponse("App not found", [], 404);

    $request->mergeIfMissing(['page' => 1, 'pageSize' => 20]);

    return Review::tablingCollect(
      $request,
      load: ['user'],
      selects: ['reviews.*'],
      query: Review::query()->where('app_id', $app->id)->where('status', 'published'),
    );
  }

  /**
   * Streams the latest published `.apk` for an app the caller may access.
   *
   * Authentication is resolved here rather than in middleware so a browser
   * fallback can pass the Sanctum token as `?token=` (a browser cannot set the
   * `Authorization` header). The native in-app download still uses the header.
   */
  public function download(Request $request, App $app)
  {
    $user = $this->resolveUser($request);

    if (!$user || !$user->can('app.view'))
      return $this->apiErrorResponse("Unauthenticated", [], 401);

    if (!$this->isVisible($app, $user))
      return $this->apiErrorResponse("App not found", [], 404);

    $version = $this->installableVersion($app);

    if (!$version)
      return $this->apiErrorResponse("This app has no published version", [], 404);

    $file = $version->file;

    if (!$file || !Storage::disk('public')->exists($file->path))
      return $this->apiErrorResponse("Installer file not found", [], 404);

    DownloadHistory::create([
      'device_id'   => null,
      'user_id'     => $user->id,
      'target_type' => Version::class,
      'target_id'   => $version->id,
    ]);

    Log::record(
      'download',
      "Downloaded {$app->name} {$version->name}",
      [$app, $version, $user],
      ['version' => $version->name],
    );

    return response()->download(
      Storage::disk('public')->path($file->path),
      "{$app->package_name}-{$version->name}.apk",
      ['Content-Length' => Storage::disk('public')->size($file->path)],
    );
  }

  /* ---------------------------------------------------------------- */

  private function resolveUser(Request $request): ?User
  {
    /** @var User|null $user */
    $user = auth('sanctum')->user();

    if ($user)
      return $user;

    $token = $request->query('token');

    if (!$token)
      return null;

    $accessToken = PersonalAccessToken::findToken($token);

    if (!$accessToken)
      return null;

    if ($accessToken->expires_at && $accessToken->expires_at->isPast())
      return null;

    $owner = $accessToken->tokenable;

    return $owner instanceof User ? $owner : null;
  }

  /** Apps in the caller's domains that have something published. */
  private function scopedAppsQuery(User $user)
  {
    $query = App::query()
      ->whereHas('versions', fn ($q) => $q->where('status', 'published'))
      ->orderBy('name');

    if (!$this->isPrivileged($user))
      $query->whereHas('domains.users', fn ($q) => $q->where('users.id', $user->id));

    return $query;
  }

  private function isPrivileged(User $user): bool
  {
    return in_array($user->role, ['super-admin', 'admin', 'developer'], true);
  }

  private function isVisible(App $app, User $user): bool
  {
    if (!$app->versions()->where('status', 'published')->exists())
      return false;

    if ($this->isPrivileged($user))
      return true;

    return $app->domains()
      ->whereHas('users', fn ($q) => $q->where('users.id', $user->id))
      ->exists();
  }

  /** The version the install button serves: the app's latest when published, else the newest published. */
  private function installableVersion(App $app): ?Version
  {
    $latest = $app->latest;

    if ($latest && $latest->status === 'published')
      return $latest;

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
      'id'           => $app->id,
      'name'         => $app->name,
      'package_name' => $app->package_name,
      'summary'      => $app->summary,
      'logo_url'     => $app->logo_url,
      'domains'      => $app->domains
        ->map(fn (Domain $domain) => ['id' => $domain->id, 'name' => $domain->name])
        ->values(),
      'version'      => $version?->name,
      'update_type'  => $version?->update_type,
      'updated_at'   => $version?->created_at?->toIso8601String(),
      'rating_avg'   => $app->reviews_avg_rating !== null ? (float) $app->reviews_avg_rating : null,
      'rating_count' => (int) ($app->reviews_count ?? 0),
      'download_url' => url("/api/store/apps/{$app->id}/download"),
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

  private function detail(App $app): array
  {
    return [
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
