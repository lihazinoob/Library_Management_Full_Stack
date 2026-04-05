<?php

namespace App\Services;

use App\Models\Book;
use App\Models\IssuedBook;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class ReservationService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function createReservation(User $user, array $data): Reservation
    {
        $book = Book::query()->findOrFail($data['book_id']);

        if ($book->status !== 'available' || $book->available_copies < 1) {
            throw new ConflictHttpException('This book is not available for reservation.');
        }

        $hasActiveReservation = Reservation::query()
            ->where('user_id', $user->id)
            ->where('book_id', $book->id)
            ->whereIn('status', ['pending', 'approved', 'collected'])
            ->exists();

        if ($hasActiveReservation) {
            throw new ConflictHttpException('You already have an active reservation for this book.');
        }

        $hasActiveIssue = IssuedBook::query()
            ->where('user_id', $user->id)
            ->where('book_id', $book->id)
            ->whereIn('status', ['issued', 'overdue'])
            ->exists();

        if ($hasActiveIssue) {
            throw new ConflictHttpException('You already have an active issued record for this book.');
        }

        $reservation = Reservation::query()->create([
            'user_id' => $user->id,
            'book_id' => $book->id,
            'reservation_code' => $this->generateReservationCode(),
            'reserved_at' => now(),
            'expires_at' => now()->addDays(2),
            'status' => 'pending',
            'notes' => $data['notes'] ?? null,
        ]);

        return $reservation->load(['book.category', 'user']);
    }

    public function getUserReservations(User $user): Collection
    {
        return Reservation::query()
            ->with(['book.category'])
            ->where('user_id', $user->id)
            ->latest()
            ->get();
    }

    public function cancelReservation(User $user, Reservation $reservation): Reservation
    {
        if ((int) $reservation->user_id !== (int) $user->id) {
            throw new AuthorizationException('You are not allowed to cancel this reservation.');
        }

        if (!in_array($reservation->status, ['pending', 'approved'], true)) {
            throw new ConflictHttpException('Only pending or approved reservations can be cancelled.');
        }

        $reservation->update([
            'status' => 'cancelled',
        ]);

        return $reservation->fresh(['book.category', 'user']);
    }

    public function getAdminReservations(): Collection
    {
        return Reservation::query()
            ->with(['book.category', 'user'])
            ->latest()
            ->get();
    }

    public function getReservationDetails(Reservation $reservation): Reservation
    {
        return $reservation->load(['book.category', 'user', 'issuedBooks']);
    }

    /**
     * @return array{reservation: \App\Models\Reservation, issued_book: \App\Models\IssuedBook}
     */
    public function approveReservation(Reservation $reservation, User $admin): array
    {
        if ($reservation->status !== 'pending') {
            throw new ConflictHttpException('Only pending reservations can be approved.');
        }

        return DB::transaction(function () use ($reservation, $admin) {
            /** @var \App\Models\Reservation $lockedReservation */
            $lockedReservation = Reservation::query()
                ->whereKey($reservation->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedReservation->status !== 'pending') {
                throw new ConflictHttpException('Only pending reservations can be approved.');
            }

            /** @var \App\Models\Book $book */
            $book = Book::query()
                ->whereKey($lockedReservation->book_id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($book->status !== 'available' || $book->available_copies < 1) {
                throw new ConflictHttpException('This book is no longer available for approval.');
            }

            $alreadyIssued = IssuedBook::query()
                ->where('reservation_id', $lockedReservation->id)
                ->exists();

            if ($alreadyIssued) {
                throw new ConflictHttpException('An issued record already exists for this reservation.');
            }

            $lockedReservation->update([
                'status' => 'approved',
            ]);

            $issuedBook = IssuedBook::query()->create([
                'user_id' => $lockedReservation->user_id,
                'book_id' => $lockedReservation->book_id,
                'reservation_id' => $lockedReservation->id,
                'issue_date' => now()->toDateString(),
                'due_date' => now()->addDays(14)->toDateString(),
                'status' => 'issued',
                'issued_by' => $admin->id,
                'fine_amount' => 0,
            ]);

            $nextAvailableCopies = $book->available_copies - 1;

            $book->update([
                'available_copies' => $nextAvailableCopies,
                'status' => $nextAvailableCopies > 0 ? 'available' : 'out_of_stock',
            ]);

            return [
                'reservation' => $lockedReservation->fresh(['book.category', 'user']),
                'issued_book' => $issuedBook->fresh(['book.category', 'user', 'reservation', 'issuedBy']),
            ];
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function rejectReservation(Reservation $reservation, array $data = []): Reservation
    {
        if (!in_array($reservation->status, ['pending', 'approved'], true)) {
            throw new ConflictHttpException('Only pending or approved reservations can be rejected.');
        }

        $reservation->update([
            'status' => 'cancelled',
            'notes' => $data['notes'] ?? $reservation->notes,
        ]);

        return $reservation->fresh(['book.category', 'user']);
    }

    private function generateReservationCode(): string
    {
        do {
            $code = 'RSV-'.strtoupper(Str::random(10));
        } while (Reservation::query()->where('reservation_code', $code)->exists());

        return $code;
    }
}
