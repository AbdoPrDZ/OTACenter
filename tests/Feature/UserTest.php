<?php

namespace Tests\Feature;

use App\Models\Domain;
use App\Models\User;
use App\Models\UserDomain;
use Tests\TestCase;

class UserTest extends TestCase
{
  public function test_show_returns_a_user(): void
  {
    $user = User::create([
      'name' => 'Shown User',
      'login' => 'shown_user',
      'password' => 'password',
    ]);

    $response = $this->withHeaders($this->authHeaders())
      ->getJson('/api/user/' . $user->id);

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('item.login', 'shown_user');
  }

  public function test_destroy_deletes_a_user(): void
  {
    $user = User::create([
      'name' => 'Deleted User',
      'login' => 'deleted_user',
      'password' => 'password',
    ]);

    $response = $this->withHeaders($this->authHeaders())
      ->deleteJson('/api/user/' . $user->id);

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('message', 'User deleted successfully');

    $this->assertSoftDeleted('users', [
      'id' => $user->id,
    ]);
  }

  public function test_user_domain_index_lists_bound_domains(): void
  {
    $user = User::create([
      'name' => 'Domain User',
      'login' => 'domain_user',
      'password' => 'password',
    ]);

    $domain = Domain::create([
      'name' => 'example.test',
      'description' => 'Example domain',
    ]);

    UserDomain::create([
      'user_id' => $user->id,
      'domain_id' => $domain->id,
    ]);

    $listResponse = $this->withHeaders($this->authHeaders())
      ->getJson('/api/user/' . $user->id . '/domain?page=1');

    $listResponse->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('itemsCount', 1);
  }
}
