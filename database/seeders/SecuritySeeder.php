<?php

namespace Database\Seeders;


use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class SecuritySeeder extends Seeder
{
  use WithoutModelEvents;

  /**
   * Run the database seeds.
   */
  public function run(): void
  {
    $roles = [
      'super-admin' => Role::firstOrCreate(['name' => 'super-admin']),
      'admin'       => Role::firstOrCreate(['name' => 'admin']),
      'developer'   => Role::firstOrCreate(['name' => 'developer']),
      'user'        => Role::firstOrCreate(['name' => 'user']),
      'guest'       => Role::firstOrCreate(['name' => 'guest']),
    ];

    $security = [
      'role.view'            => ['super-admin', 'admin'],
      'role.attach'          => ['super-admin', 'admin'],
      'role.detach'          => ['super-admin', 'admin'],

      'user.view'            => ['super-admin', 'admin'],
      'user.invite'          => ['super-admin', 'admin'],
      'user.delete'          => ['super-admin', 'admin'],

      'permission.view'      => ['super-admin', 'admin'],
      'permission.attach'    => ['super-admin', 'admin'],
      'permission.detach'   => ['super-admin', 'admin'],

      'domain.view'          => ['super-admin', 'admin', 'developer', 'user'],
      'domain.create'        => ['super-admin', 'admin'],
      'domain.update'        => ['super-admin', 'admin'],
      'domain.delete'        => ['super-admin', 'admin'],
      'domain.assign_user'   => ['super-admin', 'admin'],
      'domain.unassign_user' => ['super-admin', 'admin'],
      'domain.assign_app'    => ['super-admin', 'admin'],
      'domain.unassign_app'  => ['super-admin', 'admin'],

      'app.view'             => ['super-admin', 'admin', 'developer', 'user'],
      'app.create'           => ['super-admin', 'admin'],
      'app.update'           => ['super-admin', 'admin'],
      'app.delete'           => ['super-admin', 'admin'],
      'app.publish'          => ['super-admin', 'admin'],

      'version.view'         => ['super-admin', 'admin', 'developer', 'user'],
      'version.create'       => ['super-admin', 'admin', 'developer'],
      'version.update'       => ['super-admin', 'admin', 'developer'],
      'version.delete'       => ['super-admin', 'admin'],
      'version.publish'      => ['super-admin', 'admin'],

      'bundle.view'          => ['super-admin', 'admin', 'developer', 'user'],
      'bundle.create'        => ['super-admin', 'admin', 'developer'],
      'bundle.update'        => ['super-admin', 'admin', 'developer'],
      'bundle.delete'        => ['super-admin', 'admin'],
      'bundle.publish'       => ['super-admin', 'admin'],

      'screenshot.view'      => ['super-admin', 'admin', 'developer', 'user'],
      'screenshot.create'    => ['super-admin', 'admin', 'developer'],
      'screenshot.update'    => ['super-admin', 'admin', 'developer'],
      'screenshot.delete'    => ['super-admin', 'admin'],
    ];

    foreach ($security as $permission => $roles) {
      $perm = Permission::firstOrCreate(['name' => $permission]);
      foreach ($roles as $role) {
        $perm->assignRole($role);
      }
    }
  }
}
