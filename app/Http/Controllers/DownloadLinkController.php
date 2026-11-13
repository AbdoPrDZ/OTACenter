<?php

namespace App\Http\Controllers;

use App\Models\App;
use App\Models\DownloadHistory;
use App\Models\DownloadLink;
use App\Models\Log;
use App\Models\User;
use App\Models\Version;
use App\Src\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

/**
 * Dashboard-generated download links (URL + QR code) and the download they point to.
 *
 *   GET    /api/app/{app}/download-link          list the app's links (+ download counts)
 *   POST   /api/app/{app}/download-link          create one
 *   DELETE /api/app/{app}/download-link/{link}   revoke one (kept for statistics)
 *   GET    /download/{app}?token=…                the link itself (browser / QR scan)
 */
class DownloadLinkController extends Controller
{
  /** Allowed lifetimes in days; null = never expires. */
  public const EXPIRY_DAYS = [1, 7, 30, 90, 365];

  public function index(Request $request, App $app)
  {
    $request->mergeIfMissing(['page' => 1, 'pageSize' => 50]);

    return DownloadLink::tablingCollect(
      $request,
      load: ['user', 'creator'],
      query: DownloadLink::query()
        ->where('app_id', $app->id)
        ->withCount('downloads')
        ->orderByDesc('id'),
      selects: ['download_links.*'],
      map: fn (DownloadLink $link) => $link->toArray(),
    );
  }

  public function store(Request $request, App $app)
  {
    $validator = Validator::make($request->all(), [
      'user_id'         => 'nullable|integer|exists:users,id',
      'label'           => 'nullable|string|max:100',
      'expires_in_days' => 'nullable|integer|in:' . implode(',', self::EXPIRY_DAYS),
    ]);

    if ($validator->fails())
      return $this->apiInvalidValuesResponse($validator->errors()->toArray());

    $actor = $request->user();
    $user  = $request->filled('user_id') ? User::find($request->integer('user_id')) : $actor;

    # Counting downloads against someone else needs the right to see users.
    if ($user->id !== $actor->id && !$actor->can('user.view'))
      return $this->apiErrorResponse('You can only create download links for yourself.', [], 403);

    $link = DownloadLink::generate(
      $app,
      $user,
      $actor,
      $request->filled('expires_in_days') ? now()->addDays($request->integer('expires_in_days')) : null,
      $request->input('label'),
    );

    Log::record(
      'download_link.created',
      "Download link created for {$app->name}",
      array_values(array_filter([$app, $user, $actor])),
      ['link_id' => $link->id, 'user' => $user->login],
    );

    return $this->apiSuccessResponse('Download link created successfully', [
      'item' => $link->fresh(['user', 'creator'])->toArray(),
    ]);
  }

  public function destroy(Request $request, App $app, DownloadLink $link)
  {
    if ((int) $link->app_id !== (int) $app->id)
      return $this->apiErrorResponse('Not found', [], 404);

    if (!$link->isRevoked())
      $link->update(['revoked_at' => now()]);

    Log::record(
      'download_link.revoked',
      "Download link revoked for {$app->name}",
      array_values(array_filter([$app, $request->user()])),
      ['link_id' => $link->id],
    );

    return $this->apiSuccessResponse('Download link revoked successfully', [
      'item' => $link->fresh(['user', 'creator'])->toArray(),
    ]);
  }

  /**
   * The link a browser or QR scan opens. With a valid token it downloads the
   * app's current build — public or private — and counts it for the token's
   * user. Without a token only public apps download, counted as anonymous (or
   * for the signed-in user, if any).
   */
  public function download(Request $request, App $app)
  {
    $link = null;
    $user = null;

    if ($request->filled('token')) {
      $link = DownloadLink::findByToken((string) $request->query('token'));

      if (!$link || (int) $link->app_id !== (int) $app->id)
        abort(404);

      if (!$link->isActive())
        abort(410, 'This download link has expired or was revoked.');

      $user = $link->user;
    } else {
      if (!$this->isPublic($app))
        abort(404);

      $user = auth('sanctum')->user();
    }

    $version = $this->installableVersion($app);
    $file = $version?->file;

    if (!$file || !Storage::disk('public')->exists($file->path))
      abort(404, 'This app has no downloadable version.');

    DownloadHistory::create([
      'device_id'        => null,
      'user_id'          => $user?->id,
      'download_link_id' => $link?->id,
      'target_type'      => Version::class,
      'target_id'        => $version->id,
    ]);

    $link?->forceFill(['last_used_at' => now()])->save();

    Log::record(
      'download',
      "Downloaded {$app->name} {$version->name}" . ($link ? ' via link' : ''),
      array_values(array_filter([$app, $version, $user])),
      ['version' => $version->name, 'link_id' => $link?->id],
    );

    return response()->download(
      Storage::disk('public')->path($file->path),
      "{$app->package_name}-{$version->name}.apk",
      ['Content-Length' => Storage::disk('public')->size($file->path), ...$file->checksumHeaders()],
    );
  }

  /* ---------------------------------------------------------------- */

  private function isPublic(App $app): bool
  {
    return $app->domains()->where('is_public', true)->exists();
  }

  /** The app's current version when published, else its newest published one. */
  private function installableVersion(App $app): ?Version
  {
    $latest = $app->latest;

    if ($latest && $latest->status === 'published')
      return $latest;

    return $app->versions()
      ->where('status', 'published')
      ->where('is_demo', false)
      ->orderByDesc('id')
      ->first();
  }
}
