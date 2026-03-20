<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_member_can_list_books(): void
    {
        $member = User::factory()->create([
            'role' => 'member',
            'status' => 'active',
        ]);

        $category = Category::create([
            'name' => 'Science',
            'slug' => 'science',
            'is_active' => true,
        ]);

        $book = Book::create([
            'category_id' => $category->id,
            'title' => 'Clean Architecture',
            'author' => 'Robert C. Martin',
            'isbn' => '9780134494166',
            'total_copies' => 3,
            'available_copies' => 2,
            'status' => 'available',
        ]);

        $token = auth('api')->login($member);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/books');

        $response->assertStatus(200)
            ->assertJsonFragment([
                'id' => $book->id,
                'title' => 'Clean Architecture',
                'author' => 'Robert C. Martin',
                'status' => 'available',
            ])
            ->assertJsonFragment([
                'id' => $category->id,
                'name' => 'Science',
                'slug' => 'science',
            ]);
    }

    public function test_member_cannot_create_book(): void
    {
        $member = User::factory()->create([
            'role' => 'member',
            'status' => 'active',
        ]);

        $category = Category::create([
            'name' => 'Programming',
            'slug' => 'programming',
            'is_active' => true,
        ]);

        $token = auth('api')->login($member);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/books', [
                'category_id' => $category->id,
                'title' => 'Laravel Up and Running',
                'author' => 'Matt Stauffer',
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Only admins can perform this action.',
            ]);
    }

    public function test_admin_can_create_book(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);

        $category = Category::create([
            'name' => 'Programming',
            'slug' => 'programming',
            'is_active' => true,
        ]);

        $token = auth('api')->login($admin);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/books', [
                'category_id' => $category->id,
                'title' => 'Laravel Up and Running',
                'author' => 'Matt Stauffer',
                'isbn' => '9781492041214',
                'publisher' => 'OReilly Media',
                'publication_year' => 2019,
                'total_copies' => 5,
                'available_copies' => 5,
                'shelf_location' => 'A-12',
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'message' => 'Book created successfully.',
                'title' => 'Laravel Up and Running',
                'author' => 'Matt Stauffer',
                'created_by' => $admin->id,
                'updated_by' => $admin->id,
            ]);

        $this->assertDatabaseHas('books', [
            'title' => 'Laravel Up and Running',
            'author' => 'Matt Stauffer',
            'created_by' => $admin->id,
            'updated_by' => $admin->id,
        ]);
    }

    public function test_admin_cannot_create_book_when_available_copies_exceed_total_copies(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);

        $category = Category::create([
            'name' => 'History',
            'slug' => 'history',
            'is_active' => true,
        ]);

        $token = auth('api')->login($admin);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/books', [
                'category_id' => $category->id,
                'title' => 'Sapiens',
                'author' => 'Yuval Noah Harari',
                'total_copies' => 2,
                'available_copies' => 3,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['available_copies']);
    }

    public function test_admin_can_update_book(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);

        $category = Category::create([
            'name' => 'Software Engineering',
            'slug' => 'software-engineering',
            'is_active' => true,
        ]);

        $book = Book::create([
            'category_id' => $category->id,
            'title' => 'Refactoring',
            'author' => 'Martin Fowler',
            'isbn' => '9780201485677',
            'total_copies' => 4,
            'available_copies' => 4,
            'status' => 'available',
            'created_by' => $admin->id,
            'updated_by' => $admin->id,
        ]);

        $token = auth('api')->login($admin);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson('/api/books/'.$book->id, [
                'available_copies' => 0,
                'shelf_location' => 'B-08',
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment([
                'message' => 'Book updated successfully.',
                'status' => 'out_of_stock',
                'shelf_location' => 'B-08',
                'updated_by' => $admin->id,
            ]);

        $this->assertDatabaseHas('books', [
            'id' => $book->id,
            'available_copies' => 0,
            'status' => 'out_of_stock',
            'shelf_location' => 'B-08',
            'updated_by' => $admin->id,
        ]);
    }

    public function test_admin_can_delete_book(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);

        $category = Category::create([
            'name' => 'Design',
            'slug' => 'design',
            'is_active' => true,
        ]);

        $book = Book::create([
            'category_id' => $category->id,
            'title' => 'The Design of Everyday Things',
            'author' => 'Don Norman',
            'isbn' => '9780465050659',
            'total_copies' => 2,
            'available_copies' => 2,
            'status' => 'available',
        ]);

        $token = auth('api')->login($admin);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson('/api/books/'.$book->id);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Book deleted successfully.',
            ]);

        $this->assertDatabaseMissing('books', [
            'id' => $book->id,
        ]);
    }
}
