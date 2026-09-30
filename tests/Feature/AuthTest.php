<?php

namespace Tests\Feature;

use Tests\TestCase;

class AuthTest extends TestCase
{
  public function test_login_returns_a_token_for_the_seeded_user(): void
  {
    $response = $this->postJson('/api/auth/login', [
      'login' => 'test_user',
      'password' => 'password',
    ]);

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('message', 'User logged in successfully')
      ->assertJsonStructure(['success', 'message', 'token']);

    $this->assertNotEmpty($response->json('token'));
    $this->assertDatabaseCount('personal_access_tokens', 1);
  }

  public function test_me_returns_the_authenticated_user(): void
  {
    $response = $this->withHeaders($this->authHeaders())
      ->getJson('/api/auth/me');

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('user.login', 'test_user')
      ->assertJsonPath('user.name', 'Test User');
  }

  public function test_profile_update_changes_the_current_user(): void
  {
    $response = $this->withHeaders($this->authHeaders())
      ->putJson('/api/auth/profile', [
        'name' => 'Updated Test User',
      ]);

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('user.name', 'Updated Test User');

    $this->assertDatabaseHas('users', [
      'login' => 'test_user',
      'name' => 'Updated Test User',
    ]);
  }

  public function test_logout_revokes_the_authenticated_tokens(): void
  {
    $response = $this->withHeaders($this->authHeaders())
      ->deleteJson('/api/auth/logout');

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('message', 'User logged out successfully');

    $this->assertDatabaseCount('personal_access_tokens', 0);
  }
}
