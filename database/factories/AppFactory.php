<?php

namespace Database\Factories;

use App\Models\App;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<App>
 */
class AppFactory extends Factory
{
  /**
   * Define the model's default state.
   *
   * @return array<string, mixed>
   */
  public function definition(): array
  {
    return [
      'name'         => $this->faker->company(),
      'package_name' => $this->faker->unique()->domainWord() . '.' . $this->faker->unique()->domainWord(),
      'summary'      => $this->faker->sentence(6),
      'description'  => $this->faker->realText(150),
      'logo_id'      => null,
    ];
  }
}
