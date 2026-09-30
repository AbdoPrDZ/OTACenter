<?php

namespace Tests\Feature\Rbac;

use App\Models\Role;
use Tests\TestCase;

class RoleBindingTest extends TestCase
{
  public function test_attach_and_detach_user_to_role(): void
  {
    $headers = $this->headersFor($this->createUser('binding_admin', ['admin']));

    $role = Role::where('name', 'developer')->firstOrFail();
    $user = $this->createUser('binding_user_' . uniqid());

    $this->withHeaders($headers)
      ->postJson("/api/role/{$role->id}/user/{$user->id}")
      ->assertStatus(200);

    $user->refresh();
    $this->assertTrue($user->hasRole('developer'));

    $this->withHeaders($headers)
      ->postJson("/api/role/{$role->id}/user/{$user->id}")
      ->assertStatus(400);

    $this->withHeaders($headers)
      ->deleteJson("/api/role/{$role->id}/user/{$user->id}")
      ->assertStatus(200);

    $user->refresh();
    $this->assertFalse($user->hasRole('developer'));

    $this->withHeaders($headers)
      ->deleteJson("/api/role/{$role->id}/user/{$user->id}")
      ->assertStatus(400);
  }

  public function test_index_users_returns_attached_users(): void
  {
    $headers = $this->headersFor($this->createUser('binding_admin', ['admin']));

    $role = Role::where('name', 'user')->firstOrFail();
    $first = $this->createUser('binding_first_' . uniqid(), ['user']);
    $second = $this->createUser('binding_second_' . uniqid(), ['user']);

    $response = $this->withHeaders($headers)
      ->getJson("/api/role/{$role->id}/user")
      ->assertStatus(200);

    $ids = collect($response->json('items'))->pluck('id')->all();
    $this->assertContains($first->id, $ids);
    $this->assertContains($second->id, $ids);
  }
}
