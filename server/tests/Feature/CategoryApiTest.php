<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CategoryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_categories_index_requires_authentication(): void
    {
        $response = $this->getJson('/api/categories');

        $response->assertStatus(401);
    }

    public function test_authenticated_user_can_view_categories_ordered_by_name(): void
    {
        $token = $this->createTokenForUser();

        Category::create([
            'name' => 'Science',
            'slug' => 'science',
            'description' => 'Science books',
            'is_active' => true,
        ]);

        Category::create([
            'name' => 'Art',
            'slug' => 'art',
            'description' => 'Art books',
            'is_active' => false,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/categories');

        $response->assertStatus(200)
            ->assertJsonCount(2)
            ->assertJsonPath('0.name', 'Art')
            ->assertJsonPath('0.slug', 'art')
            ->assertJsonPath('0.is_active', false)
            ->assertJsonPath('1.name', 'Science')
            ->assertJsonPath('1.slug', 'science')
            ->assertJsonPath('1.is_active', true);
    }

    public function test_member_cannot_create_category(): void
    {
        $token = $this->createTokenForUser('member');

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/categories', [
                'name' => 'Science',
                'slug' => 'science',
                'description' => 'Science books',
                'is_active' => true,
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Only admins can perform this action.',
            ]);
    }

    public function test_admin_can_create_category(): void
    {
        $token = $this->createTokenForUser('admin');

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/categories', [
                'name' => 'Science',
                'slug' => 'science',
                'description' => 'Science and research books',
                'is_active' => true,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'Category created successfully.',
                'category' => [
                    'name' => 'Science',
                    'slug' => 'science',
                    'description' => 'Science and research books',
                    'is_active' => true,
                ],
            ]);

        $this->assertDatabaseHas('categories', [
            'name' => 'Science',
            'slug' => 'science',
            'description' => 'Science and research books',
            'is_active' => true,
        ]);
    }

    public function test_create_category_returns_validation_errors_for_invalid_payload(): void
    {
        $token = $this->createTokenForUser('admin');

        Category::create([
            'name' => 'Science',
            'slug' => 'science',
            'description' => 'Existing category',
            'is_active' => true,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/categories', [
                'name' => '',
                'slug' => 'science',
                'description' => ['invalid'],
                'is_active' => 'yes',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'name',
                'slug',
                'description',
                'is_active',
            ]);
    }

    public function test_member_cannot_update_category(): void
    {
        $token = $this->createTokenForUser('member');
        $category = Category::create([
            'name' => 'Science',
            'slug' => 'science',
            'description' => 'Science books',
            'is_active' => true,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson("/api/categories/{$category->id}", [
                'name' => 'Computer Science',
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Only admins can perform this action.',
            ]);
    }

    public function test_admin_can_update_category(): void
    {
        $token = $this->createTokenForUser('admin');
        $category = Category::create([
            'name' => 'Science',
            'slug' => 'science',
            'description' => 'Science books',
            'is_active' => true,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson("/api/categories/{$category->id}", [
                'name' => 'Computer Science',
                'slug' => 'computer-science',
                'description' => 'Programming and computing books',
                'is_active' => false,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Category updated successfully.',
                'category' => [
                    'id' => $category->id,
                    'name' => 'Computer Science',
                    'slug' => 'computer-science',
                    'description' => 'Programming and computing books',
                    'is_active' => false,
                ],
            ]);

        $this->assertDatabaseHas('categories', [
            'id' => $category->id,
            'name' => 'Computer Science',
            'slug' => 'computer-science',
            'description' => 'Programming and computing books',
            'is_active' => false,
        ]);
    }

    public function test_update_category_returns_validation_errors_for_invalid_payload(): void
    {
        $token = $this->createTokenForUser('admin');
        $category = Category::create([
            'name' => 'Science',
            'slug' => 'science',
            'description' => 'Science books',
            'is_active' => true,
        ]);

        Category::create([
            'name' => 'History',
            'slug' => 'history',
            'description' => 'History books',
            'is_active' => true,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson("/api/categories/{$category->id}", [
                'name' => 'History',
                'slug' => 'history',
                'description' => ['invalid'],
                'is_active' => 'no',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'name',
                'slug',
                'description',
                'is_active',
            ]);
    }

    public function test_admin_can_update_category_without_changing_unique_fields(): void
    {
        $token = $this->createTokenForUser('admin');
        $category = Category::create([
            'name' => 'Science',
            'slug' => 'science',
            'description' => 'Science books',
            'is_active' => true,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson("/api/categories/{$category->id}", [
                'name' => 'Science',
                'slug' => 'science',
                'description' => 'Updated description',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('category.description', 'Updated description');

        $this->assertDatabaseHas('categories', [
            'id' => $category->id,
            'name' => 'Science',
            'slug' => 'science',
            'description' => 'Updated description',
        ]);
    }

    public function test_member_cannot_delete_category(): void
    {
        $token = $this->createTokenForUser('member');
        $category = Category::create([
            'name' => 'Science',
            'slug' => 'science',
            'description' => 'Science books',
            'is_active' => true,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson("/api/categories/{$category->id}");

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Only admins can perform this action.',
            ]);

        $this->assertDatabaseHas('categories', [
            'id' => $category->id,
        ]);
    }

    public function test_admin_can_delete_category(): void
    {
        $token = $this->createTokenForUser('admin');
        $category = Category::create([
            'name' => 'Science',
            'slug' => 'science',
            'description' => 'Science books',
            'is_active' => true,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson("/api/categories/{$category->id}");

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Category deleted successfully.',
            ]);

        $this->assertDatabaseMissing('categories', [
            'id' => $category->id,
        ]);
    }

    private function createTokenForUser(string $role = 'member'): string
    {
        $user = User::factory()->create([
            'password' => Hash::make('secret123'),
            'role' => $role,
            'status' => 'active',
        ]);

        return auth('api')->login($user);
    }
}
