<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReservationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_member_can_create_reservation(): void
    {
        $member = User::factory()->create([
            'role' => 'member',
            'status' => 'active',
        ]);

        $book = $this->createAvailableBook();
        $token = auth('api')->login($member);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/reservations', [
                'book_id' => $book->id,
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'message' => 'Reservation request submitted successfully.',
                'book_id' => $book->id,
                'user_id' => $member->id,
                'status' => 'pending',
            ]);

        $this->assertDatabaseHas('reservations', [
            'user_id' => $member->id,
            'book_id' => $book->id,
            'status' => 'pending',
        ]);
    }

    public function test_member_cannot_reserve_unavailable_book(): void
    {
        $member = User::factory()->create([
            'role' => 'member',
            'status' => 'active',
        ]);

        $book = $this->createAvailableBook([
            'available_copies' => 0,
            'status' => 'out_of_stock',
        ]);

        $token = auth('api')->login($member);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/reservations', [
                'book_id' => $book->id,
            ]);

        $response->assertStatus(409)
            ->assertJson([
                'message' => 'This book is not available for reservation.',
            ]);
    }

    public function test_member_cannot_create_duplicate_active_reservation_for_same_book(): void
    {
        $member = User::factory()->create([
            'role' => 'member',
            'status' => 'active',
        ]);

        $book = $this->createAvailableBook();

        $member->reservations()->create([
            'book_id' => $book->id,
            'reservation_code' => 'RSV-EXISTING1',
            'reserved_at' => now(),
            'expires_at' => now()->addDay(),
            'status' => 'pending',
        ]);

        $token = auth('api')->login($member);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/reservations', [
                'book_id' => $book->id,
            ]);

        $response->assertStatus(409)
            ->assertJson([
                'message' => 'You already have an active reservation for this book.',
            ]);
    }

    public function test_admin_can_approve_pending_reservation_and_issue_book(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);

        $member = User::factory()->create([
            'role' => 'member',
            'status' => 'active',
        ]);

        $book = $this->createAvailableBook([
            'total_copies' => 2,
            'available_copies' => 2,
        ]);

        $reservation = $member->reservations()->create([
            'book_id' => $book->id,
            'reservation_code' => 'RSV-APPROVE1',
            'reserved_at' => now(),
            'expires_at' => now()->addDay(),
            'status' => 'pending',
        ]);

        $token = auth('api')->login($admin);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson('/api/admin/reservations/'.$reservation->id.'/approve');

        $response->assertStatus(200)
            ->assertJsonFragment([
                'message' => 'Reservation approved successfully.',
                'status' => 'approved',
                'issued_by' => $admin->id,
            ]);

        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'status' => 'approved',
        ]);

        $this->assertDatabaseHas('issued_books', [
            'reservation_id' => $reservation->id,
            'user_id' => $member->id,
            'book_id' => $book->id,
            'status' => 'issued',
            'issued_by' => $admin->id,
        ]);

        $this->assertDatabaseHas('books', [
            'id' => $book->id,
            'available_copies' => 1,
            'status' => 'available',
        ]);
    }

    private function createAvailableBook(array $overrides = []): Book
    {
        $suffix = uniqid();

        $category = Category::create([
            'name' => 'Fiction '.$suffix,
            'slug' => 'fiction-'.$suffix,
            'is_active' => true,
        ]);

        return Book::create(array_merge([
            'category_id' => $category->id,
            'title' => 'The Pragmatic Programmer',
            'author' => 'Andrew Hunt',
            'isbn' => '9780201616224'.$suffix,
            'total_copies' => 3,
            'available_copies' => 3,
            'status' => 'available',
        ], $overrides));
    }
}
