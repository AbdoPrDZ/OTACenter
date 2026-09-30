<?php

namespace Tests\Feature;

use App\Models\Domain;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class InviteTest extends TestCase
{
  private function invite(string $email, array $payload = []): TestResponse
  {
    return $this->withHeaders($this->authHeaders())
      ->postJson('/api/user/invite', array_merge([
        'name'  => 'Invited User',
        'email' => $email,
        'role'  => 'developer',
      ], $payload));
  }

  private function linkCredentials(string $link): string
  {
    parse_str((string) parse_url($link, PHP_URL_QUERY), $params);

    return $params['token'] ?? '';
  }

  private function inviteCode(string $email): string
  {
    $user = User::where('login', $email)->firstOrFail();

    return $user->tokens->first()->data['code'];
  }

  private function registerAs(string $token, array $payload): TestResponse
  {
    // The sanctum RequestGuard caches the resolved user on the shared container,
    // so without resetting it the register request would reuse the previous
    // request's authenticated user (a test-only concern).
    app('auth')->forgetGuards();

    return $this->withToken($token)
      ->postJson('/api/auth/register', $payload);
  }

  public function test_admin_can_invite_a_user(): void
  {
    $domain = Domain::create(['name' => 'invite.example']);

    $response = $this->invite('invited@example.com', ['domain_id' => $domain->id]);

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('message', 'User invited successfully')
      ->assertJsonStructure(['success', 'message', 'link']);

    $token = $this->linkCredentials($response->json('link'));
    $this->assertNotSame('', $token);

    $user = User::where('login', 'invited@example.com')->firstOrFail();

    $this->assertEquals('Invited User', $user->name);
    $this->assertTrue($user->hasRole('developer'));
    $this->assertTrue($user->domains()->where('domains.id', $domain->id)->exists());

    $this->assertCount(1, $user->tokens);
    $this->assertSame(['user.invite'], $user->tokens->first()->abilities);
    $this->assertSame($this->inviteCode('invited@example.com'), $user->tokens->first()->data['code']);
  }

  public function test_invite_link_does_not_contain_the_code(): void
  {
    $invite = $this->invite('link-only@example.com')->assertOk();

    $token = $this->linkCredentials($invite->json('link'));
    $this->assertNotSame('', $token);
    $this->assertStringNotContainsString($this->inviteCode('link-only@example.com'), $invite->json('link'));
  }

  public function test_invite_without_domain_works(): void
  {
    $this->invite('plain@example.com')->assertOk();

    $user = User::where('login', 'plain@example.com')->firstOrFail();
    $this->assertCount(0, $user->domains);
  }

  public function test_invite_rejects_duplicate_login(): void
  {
    $this->invite('duplicate@example.com')->assertOk();

    $this->invite('duplicate@example.com')->assertStatus(422);
  }

  public function test_invite_rejects_invalid_role(): void
  {
    $this->invite('bad-role@example.com', ['role' => 'nonexistent'])->assertStatus(422);
  }

  public function test_guest_cannot_invite(): void
  {
    $guest = $this->createUser('invite_guest', ['guest']);

    $response = $this->withHeaders($this->headersFor($guest))
      ->postJson('/api/user/invite', [
        'name'  => 'Nope',
        'email' => 'nope@example.com',
        'role'  => 'developer',
      ]);

    $response->assertStatus(403);
  }

  public function test_developer_cannot_invite(): void
  {
    $developer = $this->createUser('invite_dev', ['developer']);

    $response = $this->withHeaders($this->headersFor($developer))
      ->postJson('/api/user/invite', [
        'name'  => 'Nope',
        'email' => 'nope-dev@example.com',
        'role'  => 'developer',
      ]);

    $response->assertStatus(403);
  }

  public function test_invitee_can_register(): void
  {
    $invite = $this->invite('register@example.com')->assertOk();
    $token = $this->linkCredentials($invite->json('link'));

    $response = $this->registerAs($token, [
      'code'                  => $this->inviteCode('register@example.com'),
      'name'                  => 'Registered User',
      'login'                 => 'register@example.com',
      'password'              => 'password123',
      'password_confirmation' => 'password123',
    ]);

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('message', 'User registered successfully');

    $user = User::where('login', 'register@example.com')->firstOrFail();

    $this->assertEquals('Registered User', $user->name);
    $this->assertNotEquals('password123', $user->password);
    $this->assertTrue(Hash::check('password123', $user->password));

    $this->assertCount(0, $user->fresh()->tokens);
  }

  public function test_register_rejects_invalid_code(): void
  {
    $invite = $this->invite('bad-code@example.com')->assertOk();
    $token = $this->linkCredentials($invite->json('link'));

    $response = $this->registerAs($token, [
      'code'                  => 'WRONG-CODE',
      'name'                  => 'X',
      'login'                 => 'bad-code@example.com',
      'password'              => 'password123',
      'password_confirmation' => 'password123',
    ]);

    $response->assertStatus(400)
      ->assertJsonPath('message', 'Invalid code')
      ->assertJsonPath('errors.code', 'Invalid code');
  }

  public function test_register_rejects_login_mismatch(): void
  {
    $invite = $this->invite('mismatch@example.com')->assertOk();
    $token = $this->linkCredentials($invite->json('link'));

    $response = $this->registerAs($token, [
      'code'                  => $this->inviteCode('mismatch@example.com'),
      'name'                  => 'X',
      'login'                 => 'other@example.com',
      'password'              => 'password123',
      'password_confirmation' => 'password123',
    ]);

    $response->assertStatus(400)
      ->assertJsonPath('message', 'Wrong login provided. You can only register with your invite email address.');
  }

  public function test_register_requires_an_invite_token(): void
  {
    $response = $this->postJson('/api/auth/register', [
      'code'                  => 'whatever',
      'name'                  => 'X',
      'login'                 => 'no-token@example.com',
      'password'              => 'password123',
      'password_confirmation' => 'password123',
    ]);

    $response->assertStatus(401);
  }

  public function test_register_rejects_a_non_invite_token(): void
  {
    $user = $this->createUser('normal_token_user', ['user']);
    $token = $user->createToken('normal', ['none'])->plainTextToken;

    $response = $this->withToken($token)
      ->postJson('/api/auth/register', [
        'code'                  => 'whatever',
        'name'                  => 'X',
        'login'                 => 'not-invited@example.com',
        'password'              => 'password123',
        'password_confirmation' => 'password123',
      ]);

    $response->assertStatus(403);
  }

  public function test_register_requires_password_confirmation(): void
  {
    $invite = $this->invite('confirm@example.com')->assertOk();
    $token = $this->linkCredentials($invite->json('link'));

    $response = $this->registerAs($token, [
      'code'                  => $this->inviteCode('confirm@example.com'),
      'name'                  => 'X',
      'login'                 => 'confirm@example.com',
      'password'              => 'password123',
      'password_confirmation' => 'different',
    ]);

    $response->assertStatus(422);
  }
}
