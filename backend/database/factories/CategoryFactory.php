<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $slug = fake()->unique()->slug(1);

        return [
            'name_ar' => 'تصنيف '.fake()->word(),
            'name_en' => fake()->word(),
            'slug' => $slug,
            'icon' => fake()->randomElement(['bank', 'robot', 'cloud', 'truck']),
            'sort_order' => fake()->numberBetween(1, 20),
            'is_active' => true,
        ];
    }
}
