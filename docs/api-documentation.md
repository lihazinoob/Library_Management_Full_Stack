# API Documentation

This document explains the API endpoints currently defined in the Laravel backend.

The documentation is based on these files:

- [api.php](D:\Learning_Education_and_Application\Tution\Library_Management_System\server\routes\api.php)
- [Kernel.php](D:\Learning_Education_and_Application\Tution\Library_Management_System\server\app\Http\Kernel.php)
- [auth.php](D:\Learning_Education_and_Application\Tution\Library_Management_System\server\config\auth.php)
- [User.php](D:\Learning_Education_and_Application\Tution\Library_Management_System\server\app\Models\User.php)
- [Category.php](D:\Learning_Education_and_Application\Tution\Library_Management_System\server\app\Models\Category.php)
- [AuthController.php](D:\Learning_Education_and_Application\Tution\Library_Management_System\server\app\Http\Controllers\Auth\AuthController.php)
- [CategoryController.php](D:\Learning_Education_and_Application\Tution\Library_Management_System\server\app\Http\Controllers\CategoryController.php)
- [AdminMiddleware.php](D:\Learning_Education_and_Application\Tution\Library_Management_System\server\app\Http\Middleware\AdminMiddleware.php)

## Overview

The backend currently exposes two API areas:

- authentication APIs under `/api/auth`
- category management APIs under `/api/categories`
- book management APIs under `/api/books`

Current authentication and authorization strategy:

- Laravel API routes use the `api` middleware group
- The default auth guard is `api`
- The `api` guard uses the `jwt` driver
- The user provider is the Eloquent `App\Models\User` model
- Category read operations require `auth:api`
- Category write operations require both `auth:api` and custom `admin` middleware
- Book read operations require `auth:api`
- Book write operations require both `auth:api` and custom `admin` middleware

This means the project is using **JWT-based authentication** and **role-based authorization** for protected API actions.

## Middleware Behavior

From `Kernel.php`, the `api` middleware group currently includes:

- `throttle:api`
- `SubstituteBindings`

Additional route middleware used by the API:

- `auth:api` for authenticated JWT access
- `admin` for admin-only actions

The route access currently works like this:

### Public Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`

### Protected Endpoints

- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `GET /api/categories`
- `GET /api/categories/{category}`
- `POST /api/categories`
- `PUT /api/categories/{category}`
- `DELETE /api/categories/{category}`
- `GET /api/books`
- `GET /api/books/{book}`
- `POST /api/books`
- `PUT /api/books/{book}`
- `DELETE /api/books/{book}`

Protected endpoints require this header:

```http
Authorization: Bearer <your_jwt_token>
```

Category write endpoints also require the authenticated user to have:

```text
role = admin
```

If an authenticated user is a `member`, the backend returns:

```json
{
  "message": "Only admins can perform this action."
}
```

with HTTP `403 Forbidden`.

Category detail endpoint access rule:

- `GET /api/categories/{category}` is available only to authenticated admins

Book detail endpoint access rule:

- `GET /api/books/{book}` is available to any authenticated user

## Standard Response Shape For Successful Login/Register

Both `register` and `login` currently return the token payload from the controller:

```json
{
  "access_token": "jwt_token_here",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "01700000000",
    "role": "member",
    "status": "active",
    "email_verified_at": null,
    "created_at": "2026-03-18T10:00:00.000000Z",
    "updated_at": "2026-03-18T10:00:00.000000Z"
  }
}
```

Meaning of the fields:

- `access_token`: the JWT token to send in future authenticated requests
- `token_type`: usually `bearer`
- `expires_in`: token lifetime in seconds
- `user`: authenticated user information from the `users` table

## Validation Error Response Format

When validation fails, the controller returns HTTP `422 Unprocessable Entity`.

Example format:

```json
{
  "errors": {
    "email": [
      "The email field is required."
    ],
    "password": [
      "The password field is required."
    ]
  }
}
```

For category APIs, the same validation structure is used. Example:

```json
{
  "errors": {
    "slug": [
      "The slug has already been taken."
    ]
  }
}
```

## Authentication Error Response Format

Invalid credentials:

HTTP status:

```text
401 Unauthorized
```

Response:

```json
{
  "error": "Invalid email or password"
}
```

Blocked account:

HTTP status:

```text
403 Forbidden
```

Response:

```json
{
  "error": "Your account is blocked. Please contact the administrator."
}
```

Unauthenticated category request:

HTTP status:

```text
401 Unauthorized
```

Response:

```json
{
  "message": "Unauthenticated."
}
```

## Authentication Endpoints

## 1. Register User

### Endpoint

```http
POST /api/auth/register
```

### Description

Creates a new user account and immediately logs the user in by returning a JWT token.

### Request Body

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "01700000000",
  "password": "secret123",
  "password_confirmation": "secret123",
  "role": "member"
}
```

### Request Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Max 255 characters |
| `email` | string | yes | Must be a valid email and unique in `users` table |
| `phone` | string | no | Optional phone number, max 20 characters |
| `password` | string | yes | Minimum 6 characters |
| `password_confirmation` | string | yes | Must match `password` |
| `role` | string | no | Allowed values: `admin`, `member`; defaults to `member` |

### Current Backend Behavior

When registration succeeds:

- the password is hashed
- `status` is automatically set to `active`
- `role` defaults to `member` if not sent
- the user is logged in immediately
- a JWT token is returned

### Success Response

HTTP status:

```text
200 OK
```

Example response:

```json
{
  "access_token": "jwt_token_here",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "01700000000",
    "role": "member",
    "status": "active",
    "email_verified_at": null,
    "created_at": "2026-03-18T10:00:00.000000Z",
    "updated_at": "2026-03-18T10:00:00.000000Z"
  }
}
```

### Validation Failure Example

```json
{
  "errors": {
    "email": [
      "The email has already been taken."
    ],
    "password": [
      "The password confirmation does not match."
    ]
  }
}
```

## 2. Login User

### Endpoint

```http
POST /api/auth/login
```

### Description

Authenticates a user with email and password, then returns a JWT token.

### Request Body

```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

### Request Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | Must be a valid email |
| `password` | string | yes | Plain password entered by user |

### Login Rules In Current Controller

The controller currently checks:

1. Input validation
2. Whether the user exists
3. Whether the password matches the hashed password
4. Whether the user status is `active`
5. JWT login attempt

### Success Response

HTTP status:

```text
200 OK
```

Example response:

```json
{
  "access_token": "jwt_token_here",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "01700000000",
    "role": "member",
    "status": "active",
    "email_verified_at": null,
    "created_at": "2026-03-18T10:00:00.000000Z",
    "updated_at": "2026-03-18T10:00:00.000000Z"
  }
}
```

### Invalid Credentials Response

HTTP status:

```text
401 Unauthorized
```

```json
{
  "error": "Invalid email or password"
}
```

### Blocked User Response

HTTP status:

```text
403 Forbidden
```

```json
{
  "error": "Your account is blocked. Please contact the administrator."
}
```

## 3. Get Authenticated User

### Endpoint

```http
GET /api/auth/me
```

### Description

Returns the currently authenticated user based on the JWT token.

### Headers

```http
Authorization: Bearer <your_jwt_token>
Accept: application/json
```

### Success Response

HTTP status:

```text
200 OK
```

Example response:

```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "01700000000",
  "role": "member",
  "status": "active",
  "email_verified_at": null,
  "created_at": "2026-03-18T10:00:00.000000Z",
  "updated_at": "2026-03-18T10:00:00.000000Z"
}
```

### Unauthorized Response

If the token is missing, invalid, or expired, the JWT/auth middleware will reject the request.

Common response shape depends on the JWT package and exception handling setup, but typically it is one of:

```json
{
  "message": "Unauthenticated."
}
```

or

```json
{
  "error": "Token is invalid"
}
```

## 4. Logout User

### Endpoint

```http
POST /api/auth/logout
```

### Description

Invalidates the current JWT token and logs out the authenticated user.

### Headers

```http
Authorization: Bearer <your_jwt_token>
Accept: application/json
```

### Success Response

HTTP status:

```text
200 OK
```

```json
{
  "message": "Successfully logged out"
}
```

## 5. Refresh Token

### Endpoint

```http
POST /api/auth/refresh
```

### Description

Refreshes the authenticated user's JWT token and returns a new token payload.

### Headers

```http
Authorization: Bearer <your_jwt_token>
Accept: application/json
```

### Success Response

HTTP status:

```text
200 OK
```

Example response:

```json
{
  "access_token": "new_jwt_token_here",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "01700000000",
    "role": "member",
    "status": "active",
    "email_verified_at": null,
    "created_at": "2026-03-18T10:00:00.000000Z",
    "updated_at": "2026-03-18T10:00:00.000000Z"
  }
}
```

## Category Endpoints

## 6. Get All Categories

### Endpoint

```http
GET /api/categories
```

### Description

Returns all categories ordered by category name.

### Access Rule

This endpoint requires a valid JWT token.

### Headers

```http
Authorization: Bearer <your_jwt_token>
Accept: application/json
```

### Success Response

HTTP status:

```text
200 OK
```

Example response:

```json
[
  {
    "id": 1,
    "name": "Fiction",
    "slug": "fiction",
    "description": "Story books and novels",
    "is_active": true,
    "created_at": "2026-03-19T08:00:00.000000Z",
    "updated_at": "2026-03-19T08:00:00.000000Z"
  },
  {
    "id": 2,
    "name": "Science",
    "slug": "science",
    "description": "Science and research related books",
    "is_active": true,
    "created_at": "2026-03-19T08:10:00.000000Z",
    "updated_at": "2026-03-19T08:10:00.000000Z"
  }
]
```

## 7. Create Category

## 7. Get Single Category Details

### Endpoint

```http
GET /api/categories/{category}
```

### Description

Returns one category by ID with full admin-facing detail.

### Access Rule

Only an authenticated user with `role = admin` can access this endpoint.

### Headers

```http
Authorization: Bearer <your_jwt_token>
Accept: application/json
```

### Response Notes

The current controller returns:

- the category base fields
- `books_count`
- `books` ordered by title
- each returned book includes its related `category`

### Success Response

HTTP status:

```text
200 OK
```

Example response:

```json
{
  "id": 2,
  "name": "Programming",
  "slug": "programming",
  "description": "Programming and software books",
  "is_active": true,
  "created_at": "2026-03-19T08:00:00.000000Z",
  "updated_at": "2026-03-19T08:00:00.000000Z",
  "books_count": 2,
  "books": [
    {
      "id": 1,
      "category_id": 2,
      "title": "Clean Architecture",
      "author": "Robert C. Martin",
      "isbn": "9780134494166",
      "publisher": "Prentice Hall",
      "publication_year": 2017,
      "edition": null,
      "language": "English",
      "description": "A guide to software architecture and design principles.",
      "cover_image": null,
      "total_copies": 5,
      "available_copies": 3,
      "shelf_location": "A-12",
      "status": "available",
      "created_by": 1,
      "updated_by": 1,
      "created_at": "2026-03-20T08:00:00.000000Z",
      "updated_at": "2026-03-20T08:15:00.000000Z",
      "category": {
        "id": 2,
        "name": "Programming",
        "slug": "programming",
        "description": "Programming and software books",
        "is_active": true,
        "created_at": "2026-03-19T08:00:00.000000Z",
        "updated_at": "2026-03-19T08:00:00.000000Z"
      }
    }
  ]
}
```

### Forbidden Response For Member User

HTTP status:

```text
403 Forbidden
```

```json
{
  "message": "Only admins can perform this action."
}
```

## 8. Create Category

### Endpoint

```http
POST /api/categories
```

### Description

Creates a new category.

### Access Rule

Only an authenticated user with `role = admin` can access this endpoint.

### Headers

```http
Authorization: Bearer <your_jwt_token>
Accept: application/json
Content-Type: application/json
```

### Request Body

```json
{
  "name": "Science",
  "slug": "science",
  "description": "Science and research books",
  "is_active": true
}
```

### Request Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Must be unique in `categories` table |
| `slug` | string | yes | Must be unique in `categories` table |
| `description` | string | no | Optional text field |
| `is_active` | boolean | no | Defaults to `true` if not sent |

### Success Response

HTTP status:

```text
201 Created
```

Example response:

```json
{
  "message": "Category created successfully.",
  "category": {
    "id": 2,
    "name": "Science",
    "slug": "science",
    "description": "Science and research books",
    "is_active": true,
    "created_at": "2026-03-19T08:30:00.000000Z",
    "updated_at": "2026-03-19T08:30:00.000000Z"
  }
}
```

### Validation Failure Example

```json
{
  "errors": {
    "name": [
      "The name has already been taken."
    ],
    "slug": [
      "The slug has already been taken."
    ]
  }
}
```

### Forbidden Response For Member User

HTTP status:

```text
403 Forbidden
```

```json
{
  "message": "Only admins can perform this action."
}
```

## 9. Update Category

### Endpoint

```http
PUT /api/categories/{category}
```

### Description

Updates an existing category by ID.

### Access Rule

Only an authenticated user with `role = admin` can access this endpoint.

### Headers

```http
Authorization: Bearer <your_jwt_token>
Accept: application/json
Content-Type: application/json
```

### Request Body

```json
{
  "name": "Computer Science",
  "slug": "computer-science",
  "description": "Programming and computing books",
  "is_active": true
}
```

### Request Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | no | If sent, must be unique except current category |
| `slug` | string | no | If sent, must be unique except current category |
| `description` | string | no | Can be null |
| `is_active` | boolean | no | Updates category active state |

### Success Response

HTTP status:

```text
200 OK
```

Example response:

```json
{
  "message": "Category updated successfully.",
  "category": {
    "id": 2,
    "name": "Computer Science",
    "slug": "computer-science",
    "description": "Programming and computing books",
    "is_active": true,
    "created_at": "2026-03-19T08:30:00.000000Z",
    "updated_at": "2026-03-19T09:00:00.000000Z"
  }
}
```

## 10. Delete Category

### Endpoint

```http
DELETE /api/categories/{category}
```

### Description

Deletes an existing category by ID.

### Access Rule

Only an authenticated user with `role = admin` can access this endpoint.

### Headers

```http
Authorization: Bearer <your_jwt_token>
Accept: application/json
```

### Success Response

HTTP status:

```text
200 OK
```

```json
{
  "message": "Category deleted successfully."
}
```

## Book Endpoints

## 11. Get All Books

### Endpoint

```http
GET /api/books
```

### Description

Returns all books ordered by title with their related category.

### Access Rule

This endpoint requires a valid JWT token.

### Headers

```http
Authorization: Bearer <your_jwt_token>
Accept: application/json
```

### Success Response

HTTP status:

```text
200 OK
```

Example response:

```json
[
  {
    "id": 1,
    "category_id": 2,
    "title": "Clean Architecture",
    "author": "Robert C. Martin",
    "isbn": "9780134494166",
    "publisher": "Prentice Hall",
    "publication_year": 2017,
    "edition": null,
    "language": "English",
    "description": "A guide to software architecture and design principles.",
    "cover_image": null,
    "total_copies": 5,
    "available_copies": 3,
    "shelf_location": "A-12",
    "status": "available",
    "created_by": 1,
    "updated_by": 1,
    "created_at": "2026-03-20T08:00:00.000000Z",
    "updated_at": "2026-03-20T08:15:00.000000Z",
    "category": {
      "id": 2,
      "name": "Programming",
      "slug": "programming",
      "description": "Programming and software books",
      "is_active": true,
      "created_at": "2026-03-19T08:00:00.000000Z",
      "updated_at": "2026-03-19T08:00:00.000000Z"
    }
  }
]
```

## 12. Get Single Book

### Endpoint

```http
GET /api/books/{book}
```

### Description

Returns one book by ID with its related category.

### Access Rule

This endpoint requires a valid JWT token.

### Headers

```http
Authorization: Bearer <your_jwt_token>
Accept: application/json
```

### Success Response

HTTP status:

```text
200 OK
```

Example response:

```json
{
  "id": 1,
  "category_id": 2,
  "title": "Clean Architecture",
  "author": "Robert C. Martin",
  "isbn": "9780134494166",
  "publisher": "Prentice Hall",
  "publication_year": 2017,
  "edition": null,
  "language": "English",
  "description": "A guide to software architecture and design principles.",
  "cover_image": null,
  "total_copies": 5,
  "available_copies": 3,
  "shelf_location": "A-12",
  "status": "available",
  "created_by": 1,
  "updated_by": 1,
  "created_at": "2026-03-20T08:00:00.000000Z",
  "updated_at": "2026-03-20T08:15:00.000000Z",
  "category": {
    "id": 2,
    "name": "Programming",
    "slug": "programming",
    "description": "Programming and software books",
    "is_active": true,
    "created_at": "2026-03-19T08:00:00.000000Z",
    "updated_at": "2026-03-19T08:00:00.000000Z"
  }
}
```

## 13. Create Book

### Endpoint

```http
POST /api/books
```

### Description

Creates a new book.

### Access Rule

Only an authenticated user with `role = admin` can access this endpoint.

### Headers

```http
Authorization: Bearer <your_jwt_token>
Accept: application/json
Content-Type: application/json
```

### Request Body

```json
{
  "category_id": 2,
  "title": "Laravel Up and Running",
  "author": "Matt Stauffer",
  "isbn": "9781492041214",
  "publisher": "OReilly Media",
  "publication_year": 2019,
  "edition": "2nd Edition",
  "language": "English",
  "description": "A practical guide to Laravel.",
  "cover_image": "covers/laravel-up-and-running.jpg",
  "total_copies": 5,
  "available_copies": 5,
  "shelf_location": "A-12",
  "status": "available"
}
```

### Request Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `category_id` | integer | yes | Must exist in `categories` table |
| `title` | string | yes | Max 255 characters |
| `author` | string | yes | Max 255 characters |
| `isbn` | string | no | Must be unique if provided |
| `publisher` | string | no | Optional |
| `publication_year` | integer | no | Optional year value |
| `edition` | string | no | Optional |
| `language` | string | no | Optional |
| `description` | string | no | Optional |
| `cover_image` | string | no | Optional file path or URL |
| `total_copies` | integer | no | Minimum `1`, defaults to `1` |
| `available_copies` | integer | no | Minimum `0`, defaults to `total_copies` |
| `shelf_location` | string | no | Optional |
| `status` | string | no | Allowed values: `available`, `out_of_stock`, `inactive` |

### Book-Specific Rules

- `available_copies` cannot be greater than `total_copies`
- if `status` is omitted, the backend sets it automatically from `available_copies`
- `created_by` and `updated_by` are automatically set from the authenticated admin

### Success Response

HTTP status:

```text
201 Created
```

Example response:

```json
{
  "message": "Book created successfully.",
  "book": {
    "id": 1,
    "category_id": 2,
    "title": "Laravel Up and Running",
    "author": "Matt Stauffer",
    "isbn": "9781492041214",
    "publisher": "OReilly Media",
    "publication_year": 2019,
    "edition": "2nd Edition",
    "language": "English",
    "description": "A practical guide to Laravel.",
    "cover_image": "covers/laravel-up-and-running.jpg",
    "total_copies": 5,
    "available_copies": 5,
    "shelf_location": "A-12",
    "status": "available",
    "created_by": 1,
    "updated_by": 1,
    "created_at": "2026-03-20T08:30:00.000000Z",
    "updated_at": "2026-03-20T08:30:00.000000Z",
    "category": {
      "id": 2,
      "name": "Programming",
      "slug": "programming",
      "description": "Programming and software books",
      "is_active": true,
      "created_at": "2026-03-19T08:00:00.000000Z",
      "updated_at": "2026-03-19T08:00:00.000000Z"
    }
  }
}
```

### Validation Failure Example

```json
{
  "errors": {
    "available_copies": [
      "The available copies must be less than or equal to total copies."
    ]
  }
}
```

### Forbidden Response For Member User

HTTP status:

```text
403 Forbidden
```

```json
{
  "message": "Only admins can perform this action."
}
```

## 14. Update Book

### Endpoint

```http
PUT /api/books/{book}
```

### Description

Updates an existing book by ID.

### Access Rule

Only an authenticated user with `role = admin` can access this endpoint.

### Headers

```http
Authorization: Bearer <your_jwt_token>
Accept: application/json
Content-Type: application/json
```

### Request Body

```json
{
  "available_copies": 0,
  "shelf_location": "B-08"
}
```

### Request Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `category_id` | integer | no | If sent, must exist in `categories` table |
| `title` | string | no | If sent, max 255 characters |
| `author` | string | no | If sent, max 255 characters |
| `isbn` | string | no | If sent, must be unique except current book |
| `publisher` | string | no | Optional |
| `publication_year` | integer | no | Optional |
| `edition` | string | no | Optional |
| `language` | string | no | Optional |
| `description` | string | no | Optional |
| `cover_image` | string | no | Optional file path or URL |
| `total_copies` | integer | no | Minimum `1` |
| `available_copies` | integer | no | Minimum `0` |
| `shelf_location` | string | no | Optional |
| `status` | string | no | Allowed values: `available`, `out_of_stock`, `inactive` |

### Update Rules

- `available_copies` cannot be greater than `total_copies`
- if `available_copies` is updated and `status` is omitted, the backend recalculates status unless the book is already `inactive`
- `updated_by` is automatically set from the authenticated admin

### Success Response

HTTP status:

```text
200 OK
```

Example response:

```json
{
  "message": "Book updated successfully.",
  "book": {
    "id": 1,
    "category_id": 2,
    "title": "Laravel Up and Running",
    "author": "Matt Stauffer",
    "isbn": "9781492041214",
    "publisher": "OReilly Media",
    "publication_year": 2019,
    "edition": "2nd Edition",
    "language": "English",
    "description": "A practical guide to Laravel.",
    "cover_image": "covers/laravel-up-and-running.jpg",
    "total_copies": 5,
    "available_copies": 0,
    "shelf_location": "B-08",
    "status": "out_of_stock",
    "created_by": 1,
    "updated_by": 1,
    "created_at": "2026-03-20T08:30:00.000000Z",
    "updated_at": "2026-03-20T09:00:00.000000Z",
    "category": {
      "id": 2,
      "name": "Programming",
      "slug": "programming",
      "description": "Programming and software books",
      "is_active": true,
      "created_at": "2026-03-19T08:00:00.000000Z",
      "updated_at": "2026-03-19T08:00:00.000000Z"
    }
  }
}
```

## 15. Delete Book

### Endpoint

```http
DELETE /api/books/{book}
```

### Description

Deletes an existing book by ID.

### Access Rule

Only an authenticated user with `role = admin` can access this endpoint.

### Headers

```http
Authorization: Bearer <your_jwt_token>
Accept: application/json
```

### Success Response

HTTP status:

```text
200 OK
```

```json
{
  "message": "Book deleted successfully."
}
```

## Frontend Integration Notes

For a React frontend, the typical flow is:

1. Call `POST /api/auth/register` or `POST /api/auth/login`
2. Store the returned `access_token`
3. Send `Authorization: Bearer <token>` in protected requests
4. Call `GET /api/auth/me` to restore logged-in user state
5. Call `GET /api/categories` after login to load the category list
6. If the user is an admin and needs category detail, call `GET /api/categories/{category}`
7. Call `GET /api/books` after login to load the book list
8. Call `GET /api/books/{book}` when the frontend needs a single book details page
9. If the user is an admin, call `POST`, `PUT`, and `DELETE` on `/api/categories`
10. If the user is an admin, call `POST`, `PUT`, and `DELETE` on `/api/books`
11. Call `POST /api/auth/refresh` when the token expires
12. Call `POST /api/auth/logout` when signing out

## Important Implementation Note

The current backend allows the `role` field during public registration:

```json
{
  "role": "admin"
}
```

This means a client could potentially create an admin account unless registration logic is later restricted.

For production, a safer approach is:

- force all public registrations to `member`
- allow only existing admins to assign the `admin` role

## Recommended Standard Headers

For most requests from frontend or Postman:

```http
Accept: application/json
Content-Type: application/json
```

For authenticated requests:

```http
Authorization: Bearer <your_jwt_token>
```

## Summary Of Current APIs

| Method | Endpoint | Auth Required | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register a new user |
| `POST` | `/api/auth/login` | No | Log in and receive JWT token |
| `GET` | `/api/auth/me` | Yes | Get current authenticated user |
| `POST` | `/api/auth/logout` | Yes | Log out current user |
| `POST` | `/api/auth/refresh` | Yes | Refresh JWT token |
| `GET` | `/api/categories` | Yes | Get all categories |
| `GET` | `/api/categories/{category}` | Yes, admin only | Get one category with detailed admin-facing data |
| `POST` | `/api/categories` | Yes, admin only | Create a category |
| `PUT` | `/api/categories/{category}` | Yes, admin only | Update a category |
| `DELETE` | `/api/categories/{category}` | Yes, admin only | Delete a category |
| `GET` | `/api/books` | Yes | Get all books |
| `GET` | `/api/books/{book}` | Yes | Get one book with its related category |
| `POST` | `/api/books` | Yes, admin only | Create a book |
| `PUT` | `/api/books/{book}` | Yes, admin only | Update a book |
| `DELETE` | `/api/books/{book}` | Yes, admin only | Delete a book |
