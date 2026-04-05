<?php

namespace App\Exceptions;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * A list of the exception types that are not reported.
     *
     * @var array<int, class-string<Throwable>>
     */
    protected $dontReport = [
        //
    ];

    /**
     * A list of the inputs that are never flashed for validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     *
     * @return void
     */
    public function register()
    {
        $this->reportable(function (Throwable $e) {
            //
        });

        $this->renderable(function (Throwable $e, $request) {
            if (!$request->is('api/*')) {
                return null;
            }

            if ($e instanceof AuthorizationException) {
                return response()->json([
                    'message' => $e->getMessage() ?: 'This action is unauthorized.',
                ], 403);
            }

            if ($e instanceof HttpExceptionInterface) {
                $message = $e->getMessage() ?: 'HTTP error.';

                if ($e->getStatusCode() === 404) {
                    $message = $this->resolveApiNotFoundMessage($request);
                }

                return response()->json([
                    'message' => $message,
                ], $e->getStatusCode(), $e->getHeaders());
            }

            return null;
        });
    }

    private function resolveApiNotFoundMessage($request): string
    {
        if ($request->is('api/admin/reservations/*') || $request->is('api/reservations/*')) {
            return 'Reservation not found.';
        }

        if ($request->is('api/books/*')) {
            return 'Book not found.';
        }

        if ($request->is('api/categories/*')) {
            return 'Category not found.';
        }

        return 'Resource not found.';
    }
}
