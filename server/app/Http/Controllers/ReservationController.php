<?php

namespace App\Http\Controllers;

use App\Http\Requests\RejectReservationRequest;
use App\Http\Requests\StoreReservationRequest;
use App\Models\Reservation;
use App\Services\ReservationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReservationController extends Controller
{
    /**
     * @var \App\Services\ReservationService
     */
    private $reservationService;

    public function __construct(ReservationService $reservationService)
    {
        $this->reservationService = $reservationService;
    }

    public function store(StoreReservationRequest $request): JsonResponse
    {
        $reservation = $this->reservationService->createReservation(
            $request->user('api'),
            $request->validated()
        );

        return response()->json([
            'message' => 'Reservation request submitted successfully.',
            'reservation' => $reservation,
        ], 201);
    }

    public function myReservations(Request $request): JsonResponse
    {
        $reservations = $this->reservationService->getUserReservations(
            $request->user('api')
        );

        return response()->json($reservations);
    }

    public function cancel(Request $request, Reservation $reservation): JsonResponse
    {
        $reservation = $this->reservationService->cancelReservation(
            $request->user('api'),
            $reservation
        );

        return response()->json([
            'message' => 'Reservation cancelled successfully.',
            'reservation' => $reservation,
        ]);
    }

    public function adminIndex(): JsonResponse
    {
        $reservations = $this->reservationService->getAdminReservations();

        return response()->json($reservations);
    }

    public function show(Reservation $reservation): JsonResponse
    {
        $reservation = $this->reservationService->getReservationDetails($reservation);

        return response()->json($reservation);
    }

    public function approve(Request $request, Reservation $reservation): JsonResponse
    {
        $result = $this->reservationService->approveReservation(
            $reservation,
            $request->user('api')
        );

        return response()->json([
            'message' => 'Reservation approved successfully.',
            'reservation' => $result['reservation'],
            'issued_book' => $result['issued_book'],
        ]);
    }

    public function reject(RejectReservationRequest $request, Reservation $reservation): JsonResponse
    {
        $reservation = $this->reservationService->rejectReservation(
            $reservation,
            $request->validated()
        );

        return response()->json([
            'message' => 'Reservation rejected successfully.',
            'reservation' => $reservation,
        ]);
    }
}
