<?php

namespace App\Http\Controllers;

use App\Models\App;
use App\Models\Bundle;
use App\Models\Domain;
use App\Models\DownloadHistory;
use App\Models\DownloadLink;
use App\Models\Role;
use App\Models\User;
use App\Models\Version;
use App\Src\Controller;

class StatisticsController extends Controller
{
  public function general()
  {
    return $this->apiSuccessResponse('General statistics retrieved successfully', [
      'statistics' => [
        'users' => [
          'total'           => User::count(),
          'with_domains'    => User::whereHas('domains')->count(),
          'without_domains' => User::whereDoesntHave('domains')->count(),
        ],
        'roles' => [
          'total' => Role::count(),
        ],
        'domains' => [
          'total' => Domain::count(),
        ],
        'apps' => [
          'total'            => App::count(),
          'with_versions'    => App::whereHas('versions')->count(),
          'without_versions' => App::whereDoesntHave('versions')->count(),
        ],
        'versions' => [
          'total'           => Version::count(),
          'by_status'       => $this->countByStatus(Version::query(), ['draft', 'review', 'published', 'cancelled']),
          'with_bundles'    => Version::whereHas('bundles')->count(),
          'without_bundles' => Version::whereDoesntHave('bundles')->count(),
        ],
        'bundles' => [
          'total'     => Bundle::count(),
          'by_status' => $this->countByStatus(Bundle::query(), ['draft', 'review', 'published', 'cancelled']),
        ],
        'downloads' => [
          ...$this->downloadCounts(DownloadHistory::query()),
          'daily'    => $this->dailyDownloads(30),
          'top_apps' => $this->topApps(5),
        ],
        'download_links' => [
          'total'  => DownloadLink::count(),
          'active' => DownloadLink::whereNull('revoked_at')
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->count(),
        ],
      ],
    ]);
  }

  /**
   * Downloads per day over the last `$days` days (oldest first, gap days as 0),
   * split by whether they came through a download-link token.
   *
   * @return array<int, array{date: string, with_token: int, without_token: int}>
   */
  private function dailyDownloads(int $days): array
  {
    $from = now()->startOfDay()->subDays($days - 1);

    $rows = DownloadHistory::query()
      ->where('created_at', '>=', $from)
      ->selectRaw('date(created_at) as day, count(*) as total, count(download_link_id) as with_token')
      ->groupByRaw('date(created_at)')
      ->get()
      ->keyBy(fn ($row) => substr((string) $row->day, 0, 10));

    $series = [];
    for ($i = 0; $i < $days; $i++) {
      $date = $from->copy()->addDays($i)->toDateString();
      $row  = $rows->get($date);

      $series[] = [
        'date'          => $date,
        'with_token'    => (int) ($row->with_token ?? 0),
        'without_token' => (int) ($row?->total ?? 0) - (int) ($row->with_token ?? 0),
      ];
    }

    return $series;
  }

  /**
   * Apps with the most downloads (versions + bundles), most first.
   *
   * @return array<int, array{id: int, name: string, logo_url: ?string, downloads: int}>
   */
  private function topApps(int $limit): array
  {
    $versionCounts = DownloadHistory::query()
      ->join('versions', 'versions.id', '=', 'download_histories.target_id')
      ->where('download_histories.target_type', Version::class)
      ->selectRaw('versions.app_id as app_id, count(*) as downloads')
      ->groupBy('versions.app_id')
      ->pluck('downloads', 'app_id');

    $bundleCounts = DownloadHistory::query()
      ->join('bundles', 'bundles.id', '=', 'download_histories.target_id')
      ->join('versions', 'versions.id', '=', 'bundles.version_id')
      ->where('download_histories.target_type', Bundle::class)
      ->selectRaw('versions.app_id as app_id, count(*) as downloads')
      ->groupBy('versions.app_id')
      ->pluck('downloads', 'app_id');

    $totals = [];
    foreach ([$versionCounts, $bundleCounts] as $counts)
      foreach ($counts as $appId => $downloads)
        $totals[$appId] = ($totals[$appId] ?? 0) + (int) $downloads;

    arsort($totals);
    $totals = array_slice($totals, 0, $limit, true);

    $apps = App::with('logo')->whereIn('id', array_keys($totals))->get()->keyBy('id');

    return collect($totals)
      ->filter(fn ($downloads, $appId) => $apps->has($appId))
      ->map(fn ($downloads, $appId) => [
        'id'        => (int) $appId,
        'name'      => $apps[$appId]->name,
        'logo_url'  => $apps[$appId]->logo_url,
        'downloads' => $downloads,
      ])
      ->values()
      ->all();
  }

  public function byUser(User $user)
  {
    return $this->apiSuccessResponse('User statistics retrieved successfully', [
      'item' => [
        'id'        => $user->id,
        'name'      => $user->name,
        'login'     => $user->login,
        'image_url' => $user->image_url,
      ],
      'statistics' => [
        'roles'         => $user->roles->map(fn (\Spatie\Permission\Models\Role $role) => [
          'id'   => $role->id,
          'name' => $role->name,
        ])->values()->all(),
        'domains'       => $user->domains->map(fn (Domain $domain) => [
          'id'   => $domain->id,
          'name' => $domain->name,
        ])->values()->all(),
        'roles_count'   => $user->roles->count(),
        'domains_count' => $user->domains->count(),
        # Downloads counted for this user (store downloads + download links).
        'downloads'     => $this->downloadCounts(DownloadHistory::where('user_id', $user->id)),
      ],
    ]);
  }

  /**
   * Download totals split by whether they came through a DownloadLink token.
   *
   * @return array{total: int, with_token: int, without_token: int}
   */
  private function downloadCounts($query): array
  {
    $total     = (clone $query)->count();
    $withToken = (clone $query)->whereNotNull('download_link_id')->count();

    return [
      'total'         => $total,
      'with_token'    => $withToken,
      'without_token' => $total - $withToken,
    ];
  }

  /** Downloads of an app's versions and bundles. */
  private function appDownloads(App $app)
  {
    $versionIds = Version::where('app_id', $app->id)->pluck('id');
    $bundleIds  = Bundle::whereIn('version_id', $versionIds)->pluck('id');

    return DownloadHistory::query()->where(function ($q) use ($versionIds, $bundleIds) {
      $q->where(fn ($q) => $q->where('target_type', Version::class)->whereIn('target_id', $versionIds))
        ->orWhere(fn ($q) => $q->where('target_type', Bundle::class)->whereIn('target_id', $bundleIds));
    });
  }

  /** Users with the most downloads of an app (top 10). */
  private function topDownloaders(App $app): array
  {
    return $this->appDownloads($app)
      ->whereNotNull('user_id')
      ->selectRaw('user_id, count(*) as downloads')
      ->groupBy('user_id')
      ->orderByDesc('downloads')
      ->limit(10)
      ->get()
      ->map(function ($row) {
        $user = User::find($row->user_id);

        return [
          'id'        => $row->user_id,
          'name'      => $user?->name,
          'login'     => $user?->login,
          'downloads' => (int) $row->downloads,
        ];
      })
      ->values()
      ->all();
  }

  public function byRole(Role $role)
  {
    $users = $role->users()
      ->get(['users.id', 'users.name', 'users.login', 'users.image_id']);

    return $this->apiSuccessResponse('Role statistics retrieved successfully', [
      'item' => [
        'id'         => $role->id,
        'name'       => $role->name,
        'guard_name' => $role->guard_name,
      ],
      'statistics' => [
        'users'       => $users->map(fn (User $user) => [
          'id'    => $user->id,
          'name'  => $user->name,
          'login' => $user->login,
        ])->values()->all(),
        'users_count' => $users->count(),
      ],
    ]);
  }

  public function byDomain(Domain $domain)
  {
    return $this->apiSuccessResponse('Domain statistics retrieved successfully', [
      'item' => [
        'id'          => $domain->id,
        'name'        => $domain->name,
        'description' => $domain->description,
        'image_url'   => $domain->image_url,
      ],
      'statistics' => [
        'users'       => $domain->users->map(fn (User $user) => [
          'id'    => $user->id,
          'name'  => $user->name,
          'login' => $user->login,
        ])->values()->all(),
        'apps'        => $domain->apps->map(fn (App $app) => [
          'id'     => $app->id,
          'name'   => $app->name,
          'status' => $app->status,
        ])->values()->all(),
        'users_count' => $domain->users->count(),
        'apps_count'  => $domain->apps->count(),
      ],
    ]);
  }

  public function byApp(App $app)
  {
    $versions = $app->versions()->withCount('bundles')->get(['id', 'name', 'status']);

    return $this->apiSuccessResponse('App statistics retrieved successfully', [
      'item' => [
        'id'           => $app->id,
        'name'         => $app->name,
        'package_name' => $app->package_name,
        'status'       => $app->status,
        'logo_url'     => $app->logo_url,
      ],
      'statistics' => [
        'versions'           => $versions->map(fn (Version $version) => [
          'id'            => $version->id,
          'name'          => $version->name,
          'status'        => $version->status,
          'bundles_count' => $version->bundles_count,
        ])->values()->all(),
        'versions_by_status' => $this->countByStatus(
          Version::where('app_id', $app->id),
          ['draft', 'review', 'published', 'cancelled'],
        ),
        'domains'            => $app->domains->map(fn (Domain $domain) => [
          'id'   => $domain->id,
          'name' => $domain->name,
        ])->values()->all(),
        'versions_count'     => $versions->count(),
        'bundles_count'      => $versions->sum('bundles_count'),
        'domains_count'      => $app->domains->count(),
        'downloads'          => $this->downloadCounts($this->appDownloads($app)),
        'top_downloaders'    => $this->topDownloaders($app),
        'download_links'     => [
          'total'  => DownloadLink::where('app_id', $app->id)->count(),
          'active' => DownloadLink::where('app_id', $app->id)
            ->whereNull('revoked_at')
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->count(),
        ],
      ],
    ]);
  }

  public function byVersion(Version $version)
  {
    return $this->apiSuccessResponse('Version statistics retrieved successfully', [
      'item' => [
        'id'          => $version->id,
        'name'        => $version->name,
        'status'      => $version->status,
        'app_id'      => $version->app_id,
        'app_name'    => $version->app?->name,
      ],
      'statistics' => [
        'bundles'          => $version->bundles->map(fn (Bundle $bundle) => [
          'id'   => $bundle->id,
          'name' => $bundle->name,
          'url'  => $bundle->url,
        ])->values()->all(),
        'bundles_count'    => $version->bundles->count(),
        'latest_bundle'    => $version->latest ? [
          'id'   => $version->latest->id,
          'name' => $version->latest->name,
        ] : null,
      ],
    ]);
  }

  private function countByStatus($query, array $statuses): array
  {
    $counts = $query
      ->selectRaw('status, count(*) as total')
      ->groupBy('status')
      ->pluck('total', 'status')
      ->all();

    $result = array_fill_keys($statuses, 0);

    foreach ($counts as $status => $total)
      if (array_key_exists($status, $result))
        $result[$status] = (int) $total;

    return $result;
  }
}
