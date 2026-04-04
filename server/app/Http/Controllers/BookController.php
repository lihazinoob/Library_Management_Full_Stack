<?php

namespace App\Http\Controllers;

use App\Models\Book;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class BookController extends Controller
{
    private const VALID_STATUSES = ['available', 'out_of_stock', 'inactive'];

    public function index(): JsonResponse
    {
        $books = Book::query()
            ->with('category')
            ->orderBy('title')
            ->get();

        return response()->json($books);
    }

    public function show(Book $book): JsonResponse
    {
        return response()->json(
            $book->load('category')
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), $this->rules());
        $validator->after(fn ($validator) => $this->validateCopies($validator, $request));

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        $validated['total_copies'] = $validated['total_copies'] ?? 1;
        $validated['available_copies'] = $validated['available_copies'] ?? $validated['total_copies'];
        $validated['status'] = $validated['status'] ?? $this->resolveStatus($validated['available_copies']);
        $validated['created_by'] = auth('api')->id();
        $validated['updated_by'] = auth('api')->id();

        $book = Book::create($validated)->load('category');

        return response()->json([
            'message' => 'Book created successfully.',
            'book' => $book,
        ], 201);
    }

    public function update(Request $request, Book $book): JsonResponse
    {
        $validator = Validator::make($request->all(), $this->rules($book));
        $validator->after(fn ($validator) => $this->validateCopies($validator, $request, $book));

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        $effectiveAvailableCopies = array_key_exists('available_copies', $validated)
            ? $validated['available_copies']
            : $book->available_copies;

        if (!array_key_exists('status', $validated) && array_key_exists('available_copies', $validated) && $book->status !== 'inactive') {
            $validated['status'] = $this->resolveStatus($effectiveAvailableCopies);
        }

        $validated['updated_by'] = auth('api')->id();

        $book->update($validated);

        return response()->json([
            'message' => 'Book updated successfully.',
            'book' => $book->fresh('category'),
        ]);
    }

    public function destroy(Book $book): JsonResponse
    {
        $book->delete();

        return response()->json([
            'message' => 'Book deleted successfully.',
        ]);
    }

    private function rules(?Book $book = null): array
    {
        $isbnRules = ['nullable', 'string', 'max:255'];

        if ($book) {
            $isbnRules[] = Rule::unique('books', 'isbn')->ignore($book->id);
        } else {
            $isbnRules[] = 'unique:books,isbn';
        }

        $prefix = $book ? 'sometimes' : 'required';

        return [
            'category_id' => [$prefix, 'required', 'integer', 'exists:categories,id'],
            'title' => [$prefix, 'required', 'string', 'max:255'],
            'author' => [$prefix, 'required', 'string', 'max:255'],
            'isbn' => $isbnRules,
            'publisher' => ['nullable', 'string', 'max:255'],
            'publication_year' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'edition' => ['nullable', 'string', 'max:255'],
            'language' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'cover_image' => ['nullable', 'string', 'max:2048'],
            'total_copies' => ['sometimes', 'integer', 'min:1'],
            'available_copies' => ['sometimes', 'integer', 'min:0'],
            'shelf_location' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', Rule::in(self::VALID_STATUSES)],
        ];
    }

    private function validateCopies($validator, Request $request, ?Book $book = null): void
    {
        $totalCopies = $request->input('total_copies', $book?->total_copies ?? 1);
        $availableCopies = $request->input(
            'available_copies',
            $book ? $book->available_copies : $request->input('total_copies', 1)
        );

        if ($availableCopies > $totalCopies) {
            $validator->errors()->add('available_copies', 'The available copies must be less than or equal to total copies.');
        }
    }

    private function resolveStatus(int $availableCopies): string
    {
        return $availableCopies === 0 ? 'out_of_stock' : 'available';
    }
}
