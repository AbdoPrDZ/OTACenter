<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SuperAdminSeeder extends Seeder
{
  /**
   * Run the database seeds.
   */
  public function run(): void
  {
    $superAdminLogin = env('APP_SUPER_ADMIN_LOGIN');
    $superAdminPassword = env('APP_SUPER_ADMIN_PASSWORD');

    if (!$superAdminLogin || !$superAdminPassword) {
      throw new \Exception("APP_SUPER_ADMIN_LOGIN and APP_SUPER_ADMIN_PASSWORD environment variables must be set.");
    }

    $superAdmin = \App\Models\User::firstOrCreate(
      ['login' => $superAdminLogin],
      [
        'name'     => 'Super Admin',
        'password' => bcrypt($superAdminPassword),
      ]
    );

    $superAdmin->assignRole('super-admin');
  }
}
