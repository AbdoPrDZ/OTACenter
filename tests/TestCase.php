<?php

namespace Tests;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
  protected function setUp(): void
  {
    parent::setUp();

    // Run the database migrations
    $this->artisan('migrate:fresh');

    // Seed the database with test data
    $this->artisan('db:seed');

    User::firstOrCreate(
      ['login' => 'test_user'],
      ['name' => 'Test User', 'password' => bcrypt('password')]
    )->assignRole('super-admin');

    // Seeder re-runs each test; drop Spatie's cached permission registry
    // so role->permission lookups reflect the fresh DB state.
    app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
  }

  protected function getToken(): string
  {
    $user = User::where('login', 'test_user')->firstOrFail();

    return $user->createToken('test')->plainTextToken;
  }

  protected function authHeaders(): array
  {
    return [
      'Authorization' => 'Bearer ' . $this->getToken(),
    ];
  }

  protected function createUser(string $login, array $roles = []): User
  {
    $user = User::firstOrCreate(
      ['login' => $login],
      ['name' => ucfirst($login)],
    );

    foreach ($roles as $role)
      $user->assignRole($role);

    return $user;
  }

  protected function headersFor(User $user): array
  {
    return [
      'Authorization' => 'Bearer ' . $user->createToken('test')->plainTextToken,
    ];
  }

  protected function superAdminHeaders(): array
  {
    return $this->headersFor($this->createUser('super_admin', ['super-admin']));
  }
}
