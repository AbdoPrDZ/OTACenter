<?php

namespace Tests\Feature\Rbac;

use App\Models\Permission;
use Tests\TestCase;

class UserPermissionBindingTest extends TestCase
{
  public function test_attach_and_detach_permission_to_user(): void
  {
    $headers = $this->headersFor($this->createUser('perm_admin', ['admin']));

    $permission = Permission::where('name', 'app.create')->firstOrFail();
    $user = $this->createUser('perm_user_' . uniqid());

    $this->withHeaders($headers)
      ->postJson("/api/user/{$user->id}/permission/{$permission->id}")
      ->assertStatus(200);

    $user->refresh();
    $this->assertTrue($user->hasDirectPermission('app.create'));

    $this->withHeaders($headers)
      ->postJson("/api/user/{$user->id}/permission/{$permission->id}")
      ->assertStatus(400);

    $this->withHeaders($headers)
      ->deleteJson("/api/user/{$user->id}/permission/{$permission->id}")
      ->assertStatus(200);

    $user->refresh();
    $this->assertFalse($user->hasDirectPermission('app.create'));

    $this->withHeaders($headers)
      ->deleteJson("/api/user/{$user->id}/permission/{$permission->id}")
      ->assertStatus(400);
  }

  public function test_index_permissions_returns_directly_granted(): void
  {
    $headers = $this->headersFor($this->createUser('perm_admin', ['admin']));

    $user = $this->createUser('perm_index_' . uniqid());
    $user->givePermissionTo('app.view');
    $user->givePermissionTo('domain.view');

    $response = $this->withHeaders($headers)
      ->getJson("/api/user/{$user->id}/permission")
      ->assertStatus(200);

    $names = collect($response->json('items'))->pluck('name')->all();
    $this->assertContains('app.view', $names);
    $this->assertContains('domain.view', $names);
  }

  public function test_index_roles_returns_user_roles(): void
  {
    $headers = $this->headersFor($this->createUser('perm_admin', ['admin']));

    $user = $this->createUser('perm_roles_' . uniqid(), ['developer', 'user']);

    $response = $this->withHeaders($headers)
      ->getJson("/api/user/{$user->id}/role")
      ->assertStatus(200);

    $names = collect($response->json('items'))->pluck('name')->all();
    $this->assertContains('developer', $names);
    $this->assertContains('user', $names);
  }
}
