<?php

namespace Tests\Feature;

use App\Models\Domain;
use Tests\TestCase;

class DomainTest extends TestCase
{
  public function test_index_returns_domains(): void
  {
    Domain::create([
      'name' => 'api.example.test',
      'description' => 'API domain',
    ]);

    $response = $this->withHeaders($this->authHeaders())
      ->getJson('/api/domain?page=1');

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('itemsCount', 1);
  }

  public function test_store_creates_a_domain(): void
  {
    $response = $this->withHeaders($this->authHeaders())
      ->postJson('/api/domain', [
        'name' => 'created.example.test',
        'description' => 'Created domain',
      ]);

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('item.name', 'created.example.test');

    $this->assertDatabaseHas('domains', [
      'name' => 'created.example.test',
    ]);
  }

  public function test_show_returns_a_domain(): void
  {
    $domain = Domain::create([
      'name' => 'shown.example.test',
      'description' => 'Shown domain',
    ]);

    $response = $this->withHeaders($this->authHeaders())
      ->getJson('/api/domain/' . $domain->id);

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('item.name', 'shown.example.test');
  }

  public function test_update_changes_a_domain(): void
  {
    $domain = Domain::create([
      'name' => 'update.example.test',
      'description' => 'Before update',
    ]);

    $response = $this->withHeaders($this->authHeaders())
      ->putJson('/api/domain/' . $domain->id, [
        'name' => 'updated.example.test',
        'description' => 'After update',
      ]);

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('item.name', 'updated.example.test');

    $this->assertDatabaseHas('domains', [
      'id' => $domain->id,
      'name' => 'updated.example.test',
    ]);
  }

  public function test_destroy_deletes_a_domain(): void
  {
    $domain = Domain::create([
      'name' => 'deleted.example.test',
      'description' => 'To be deleted',
    ]);

    $response = $this->withHeaders($this->authHeaders())
      ->deleteJson('/api/domain/' . $domain->id);

    $response->assertOk()
      ->assertJsonPath('success', true)
      ->assertJsonPath('message', 'Domain deleted successfully');

    $this->assertSoftDeleted('domains', [
      'id' => $domain->id,
    ]);
  }
}
