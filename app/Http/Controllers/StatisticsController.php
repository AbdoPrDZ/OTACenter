<?php

namespace App\Http\Controllers;

use App\Models\App;
use App\Models\Bundle;
use App\Models\Domain;
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
      ],
    ]);
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
      ],
    ]);
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
