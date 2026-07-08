<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'full_name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => '01'.fake()->numberBetween(100000000, 999999999),
            'parent_phone' => '01'.fake()->numberBetween(100000000, 999999999),
            'academic_year' => fake()->numberBetween(1, 12),
            'student_number' => 'ST'.fake()->unique()->numberBetween(1000, 9999),
            'school' => 'Test School',
            'parent_job' => 'Engineer',
            'governorate' => 'Cairo',
            'password' => Hash::make('password'),
            'status' => 'pending',
            'role' => 'student',
            'is_verified' => true,
            'is_blocked' => false,
            'wallet_balance' => 0,
        ];
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
            'rejection_reason' => null,
        ]);
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'active',
            'rejection_reason' => null,
        ]);
    }

    // public function rejected(string $reason = 'Document not clear'): static
    // {
    //     return $this->state(fn(array $attributes) => [
    //         'status' => 'rejected',
    //         'rejection_reason' => $reason,
    //     ]);
    // }

    // public function admin(): static
    // {
    //     return $this->state(fn(array $attributes) => [
    //         'role' => 'admin',
    //         'is_admin' => true,
    //         'status' => 'active',
    //     ]);
    // }
}
