# Readora Database Schema

This document defines the proposed MySQL database schema for the **Readora - AI-Powered Digital Library System** backend in Laravel.

## Schema Goals

- Support user registration and login
- Manage books and categories
- Track reservations and issued books
- Power the My Library dashboard
- Leave room for future chatbot and notification features

## Basic Database Concepts Used In This Document

Before looking at the tables, these terms are important:

### Primary Key (PK)

A **Primary Key** is the main unique identifier of a table.

Example:
- In the `users` table, `id` is the PK.
- This means each user has one unique `id`.
- No two rows can have the same PK value.

In Laravel migrations, this is usually:

```php
$table->id();
```

This creates an auto-incrementing `bigint` primary key column named `id`.

### Foreign Key (FK)

A **Foreign Key** is a column in one table that points to the primary key of another table.

Example:
- `books.category_id` points to `categories.id`
- `reservations.user_id` points to `users.id`
- `reservations.book_id` points to `books.id`

This creates a relationship between tables and helps keep the data valid.

For example:
- if a reservation belongs to a user, then `reservations.user_id` must reference a real user in the `users` table
- if a book belongs to a category, then `books.category_id` must reference a real category in the `categories` table

In Laravel migrations, this is usually:

```php
$table->foreignId('category_id')->constrained();
```

### One-to-Many Relationship

This means:
- one row in Table A can be related to many rows in Table B
- but one row in Table B belongs to only one row in Table A

Example:
- one category can have many books
- one book belongs to one category

### Nullable

If a column is **nullable**, it means the field can be empty.

Example:
- `books.isbn` can be nullable if some books do not have an ISBN
- `issued_books.return_date` is nullable until the book is returned

### Unique

If a column is **unique**, duplicate values are not allowed.

Example:
- `users.email` should be unique
- `categories.slug` should be unique

### Index

An **index** is used to make searching and filtering faster.

Think of it like the index page of a textbook:
- without an index, the database checks rows one by one
- with an index, the database can find matching rows much faster

Example:
- if users often search books by `title`, adding an index on `title` improves performance
- if the system frequently filters reservations by `user_id` and `status`, a combined index on those columns helps

Important:
- indexes improve read/query speed
- too many indexes can slightly slow down inserts and updates
- indexes do not create relationships; foreign keys create relationships

## High-Level Relationship Overview

The core relationship flow of this project is:

- A `user` can reserve many books
- A `user` can borrow many books over time
- A `category` can contain many books
- A `book` belongs to one category
- A `book` can appear in many reservations over time
- A `book` can appear in many issue records over time
- A reservation can later become an issued book record

In simple business terms:

1. Admin creates categories
2. Admin adds books under categories
3. Users register and log in
4. Users reserve books
5. Library/admin issues books to users
6. Issued books are tracked until returned
7. Later, chatbot and notification features can be attached to users

## Recommended Tables

### 1. `users`

Stores library members and administrators.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `bigIncrements` | PK | |
| `name` | `string` | not null | Full name |
| `email` | `string` | unique, not null | Login identifier |
| `phone` | `string` | nullable | Optional contact number |
| `password` | `string` | not null | Hashed password |
| `role` | `enum('admin','member')` | default `member` | Access control |
| `status` | `enum('active','blocked')` | default `active` | Account state |
| `email_verified_at` | `timestamp` | nullable | Standard Laravel field |
| `remember_token` | `string` | nullable | Standard Laravel field |
| `created_at` | `timestamp` | | |
| `updated_at` | `timestamp` | | |

Indexes:
- unique: `email`
- index: `role`
- index: `status`

Relationship meaning:
- `users.id` is the main identity of each user
- Other tables will use `user_id` to connect data back to the user
- One user can have many reservations
- One user can have many issued book records
- One user can have many chatbot conversations
- One user can receive many notifications

Why these indexes exist:
- `email` is unique because two users should not register with the same email
- `role` index helps when filtering admins vs members
- `status` index helps when filtering active or blocked users

### 2. `categories`

Stores book categories used for browsing and filtering.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `bigIncrements` | PK | |
| `name` | `string` | unique, not null | Example: Fiction, Science |
| `slug` | `string` | unique, not null | URL/API-friendly identifier |
| `description` | `text` | nullable | Optional category details |
| `is_active` | `boolean` | default `true` | Soft deactivation without deleting |
| `created_at` | `timestamp` | | |
| `updated_at` | `timestamp` | | |

Indexes:
- unique: `name`
- unique: `slug`

Relationship meaning:
- `categories.id` is the PK of the category table
- `books.category_id` will point to `categories.id`
- One category can have many books
- One book belongs to one category

Why these indexes exist:
- `name` should usually be unique to avoid duplicate categories like "Science" entered multiple times
- `slug` is unique because it is often used in URLs or APIs

### 3. `books`

Stores the master record for each book title.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `bigIncrements` | PK | |
| `category_id` | `foreignId` | constrained, not null | References `categories.id` |
| `title` | `string` | not null | |
| `author` | `string` | not null | |
| `isbn` | `string` | unique, nullable | Some books may not have ISBN |
| `publisher` | `string` | nullable | |
| `publication_year` | `year` or `smallInteger` | nullable | |
| `edition` | `string` | nullable | |
| `language` | `string` | nullable | |
| `description` | `text` | nullable | Summary or details |
| `cover_image` | `string` | nullable | Stored file path or URL |
| `total_copies` | `unsignedInteger` | default `1` | Total owned copies |
| `available_copies` | `unsignedInteger` | default `1` | Remaining copies for issue/reservation |
| `shelf_location` | `string` | nullable | Physical storage reference |
| `status` | `enum('available','out_of_stock','inactive')` | default `available` | Derived from stock/admin state |
| `created_by` | `foreignId` | nullable | Admin user who created record |
| `updated_by` | `foreignId` | nullable | Last admin editor |
| `created_at` | `timestamp` | | |
| `updated_at` | `timestamp` | | |

Indexes:
- index: `category_id`
- unique: `isbn`
- index: `title`
- index: `author`
- index: `status`

Notes:
- `available_copies` should never exceed `total_copies`.
- `status` can be updated automatically when `available_copies = 0`.

Relationship meaning:
- `books.id` is the PK of the books table
- `category_id` is an FK pointing to `categories.id`
- `created_by` can point to `users.id` to show which admin created the book
- `updated_by` can point to `users.id` to show which admin last updated the book
- One book can have many reservations over time
- One book can have many issue records over time

Why these indexes exist:
- `category_id` index helps when showing all books under a category
- `isbn` is unique because the same ISBN should not usually be stored multiple times as different master book records
- `title` index helps with book search
- `author` index helps with author search
- `status` index helps when listing only available or inactive books

### 4. `reservations`

Stores book reservation requests from users.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `bigIncrements` | PK | |
| `user_id` | `foreignId` | constrained, not null | References `users.id` |
| `book_id` | `foreignId` | constrained, not null | References `books.id` |
| `reservation_code` | `string` | unique, nullable | Optional user-facing reference |
| `reserved_at` | `timestamp` | not null | Reservation creation time |
| `expires_at` | `timestamp` | nullable | Reservation validity cutoff |
| `status` | `enum('pending','approved','collected','cancelled','expired')` | default `pending` | Workflow state |
| `notes` | `text` | nullable | Admin notes or user reason |
| `created_at` | `timestamp` | | |
| `updated_at` | `timestamp` | | |

Indexes:
- index: `user_id`
- index: `book_id`
- unique: `reservation_code`
- composite index: `user_id, status`
- composite index: `book_id, status`

Business rules:
- A user should not have multiple active reservations for the same book.
- Expired or cancelled reservations should release reserved stock.

Relationship meaning:
- `reservations.id` is the PK of the reservations table
- `user_id` is an FK pointing to `users.id`
- `book_id` is an FK pointing to `books.id`
- Each reservation belongs to exactly one user
- Each reservation belongs to exactly one book
- One user can create many reservations
- One book can receive many reservations over time

Why these indexes exist:
- `user_id` index helps when viewing a user's reservation list
- `book_id` index helps when viewing all reservations for a specific book
- `reservation_code` is unique so each reservation can have a clean public reference
- combined index `user_id, status` helps queries like "show all pending reservations for this user"
- combined index `book_id, status` helps queries like "show all active reservations for this book"

### 5. `issued_books`

Tracks borrowing and return history for the My Library dashboard.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `bigIncrements` | PK | |
| `user_id` | `foreignId` | constrained, not null | References `users.id` |
| `book_id` | `foreignId` | constrained, not null | References `books.id` |
| `reservation_id` | `foreignId` | nullable | Links issue to reservation when applicable |
| `issue_date` | `date` | not null | When the book was borrowed |
| `due_date` | `date` | not null | Return deadline |
| `return_date` | `date` | nullable | Filled when returned |
| `status` | `enum('issued','returned','overdue','lost')` | default `issued` | Current issue state |
| `issued_by` | `foreignId` | nullable | Admin user who issued the book |
| `received_by` | `foreignId` | nullable | Admin user who processed return |
| `fine_amount` | `decimal(10,2)` | default `0.00` | Optional late/lost fine |
| `remarks` | `text` | nullable | Additional information |
| `created_at` | `timestamp` | | |
| `updated_at` | `timestamp` | | |

Indexes:
- index: `user_id`
- index: `book_id`
- index: `reservation_id`
- composite index: `user_id, status`
- composite index: `due_date, status`

Business rules:
- `return_date` is required when `status = returned`.
- Records with `due_date < current_date` and no `return_date` can be marked `overdue`.

Relationship meaning:
- `issued_books.id` is the PK of the issued books table
- `user_id` is an FK pointing to `users.id`
- `book_id` is an FK pointing to `books.id`
- `reservation_id` is an FK pointing to `reservations.id` when the issue started from a reservation
- `issued_by` can point to `users.id` for the admin who issued the book
- `received_by` can point to `users.id` for the admin who processed the return
- Each issue record belongs to one user and one book
- One user can have many issue records over time
- One book can be issued many times over time

Why these indexes exist:
- `user_id` index helps build the My Library dashboard quickly
- `book_id` index helps review borrowing history of a specific book
- `reservation_id` index helps trace whether an issued book came from a reservation
- combined index `user_id, status` helps queries like "show all currently issued books for this user"
- combined index `due_date, status` helps queries like "show all overdue active issues"

## Optional Future-Scope Tables

These are not strictly required for the first milestone, but the proposal suggests future AI and notification features.

### 6. `chatbot_conversations`

Stores a chat session header for future OpenAI/chatbot integration.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `bigIncrements` | PK | |
| `user_id` | `foreignId` | constrained, nullable | Nullable for guest/session support if needed later |
| `session_key` | `string` | unique, not null | Frontend or backend generated session id |
| `started_at` | `timestamp` | not null | |
| `last_message_at` | `timestamp` | nullable | |
| `created_at` | `timestamp` | | |
| `updated_at` | `timestamp` | | |

Relationship meaning:
- `chatbot_conversations.id` is the PK
- `user_id` is an FK pointing to `users.id`
- One user can have many conversations
- One conversation belongs to one user, unless guest support is added later

### 7. `chatbot_messages`

Stores individual chatbot prompts and responses.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `bigIncrements` | PK | |
| `conversation_id` | `foreignId` | constrained, not null | References `chatbot_conversations.id` |
| `sender_type` | `enum('user','assistant','system')` | not null | Message origin |
| `message` | `longText` | not null | Message body |
| `metadata` | `json` | nullable | Tokens, intent, referenced books |
| `created_at` | `timestamp` | | |
| `updated_at` | `timestamp` | | |

Relationship meaning:
- `chatbot_messages.id` is the PK
- `conversation_id` is an FK pointing to `chatbot_conversations.id`
- One conversation can contain many messages
- Each message belongs to one conversation

### 8. `notifications`

Can be added later for reservation approval, due-date alerts, and reminder features.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `bigIncrements` | PK | |
| `user_id` | `foreignId` | constrained, not null | References `users.id` |
| `type` | `string` | not null | Example: `reservation_approved`, `due_reminder` |
| `title` | `string` | not null | |
| `message` | `text` | not null | |
| `is_read` | `boolean` | default `false` | |
| `read_at` | `timestamp` | nullable | |
| `created_at` | `timestamp` | | |
| `updated_at` | `timestamp` | | |

Relationship meaning:
- `notifications.id` is the PK
- `user_id` is an FK pointing to `users.id`
- One user can receive many notifications
- Each notification belongs to one user

## Relationships Summary

- One `category` has many `books`
- One `user` has many `reservations`
- One `user` has many `issued_books`
- One `book` has many `reservations`
- One `book` has many `issued_books`
- One `reservation` may lead to one `issued_books` record
- One `user` may have many `chatbot_conversations`
- One `chatbot_conversation` has many `chatbot_messages`

## Table-to-Table PK/FK Mapping

This section shows exactly which column references which table.

### `categories` -> `books`

- `categories.id` is the PK
- `books.category_id` is the FK
- Meaning: every book must belong to one category

Example:
- Category row: `id = 3`, `name = Science`
- Book row: `title = Physics Basics`, `category_id = 3`
- This means that book belongs to the Science category

### `users` -> `reservations`

- `users.id` is the PK
- `reservations.user_id` is the FK
- Meaning: every reservation belongs to one user

Example:
- User row: `id = 7`, `name = Rahim`
- Reservation row: `user_id = 7`, `book_id = 15`
- This reservation belongs to Rahim

### `books` -> `reservations`

- `books.id` is the PK
- `reservations.book_id` is the FK
- Meaning: every reservation is for one specific book

Example:
- Book row: `id = 15`, `title = Clean Code`
- Reservation row: `user_id = 7`, `book_id = 15`
- This means user 7 reserved Clean Code

### `users` -> `issued_books`

- `users.id` is the PK
- `issued_books.user_id` is the FK
- Meaning: every issue record belongs to one user

Example:
- User row: `id = 7`
- Issue row: `user_id = 7`, `book_id = 15`
- This means book 15 was issued to user 7

### `books` -> `issued_books`

- `books.id` is the PK
- `issued_books.book_id` is the FK
- Meaning: every issue record is tied to one book

### `reservations` -> `issued_books`

- `reservations.id` is the PK
- `issued_books.reservation_id` is the FK
- Meaning: an issue record may optionally come from a reservation

This is optional because:
- sometimes a book may be issued directly without reservation
- in that case `reservation_id` can be `null`

### `users` -> `books` through admin action fields

- `users.id` is the PK
- `books.created_by` is an FK to `users.id`
- `books.updated_by` is an FK to `users.id`

Meaning:
- these fields do not mean the user owns the book
- they only record which admin created or updated the book entry

### `users` -> `issued_books` through admin action fields

- `users.id` is the PK
- `issued_books.issued_by` is an FK to `users.id`
- `issued_books.received_by` is an FK to `users.id`

Meaning:
- `issued_by` stores which admin issued the book
- `received_by` stores which admin accepted the return

### `users` -> `chatbot_conversations`

- `users.id` is the PK
- `chatbot_conversations.user_id` is the FK

### `chatbot_conversations` -> `chatbot_messages`

- `chatbot_conversations.id` is the PK
- `chatbot_messages.conversation_id` is the FK

### `users` -> `notifications`

- `users.id` is the PK
- `notifications.user_id` is the FK

## Recommended Foreign Key Behavior

When defining foreign keys in Laravel, you should also think about what happens when parent data is deleted.

Suggested behavior:

- `books.category_id` -> restrict delete
  - do not allow deleting a category if books still exist under it
- `reservations.user_id` -> restrict delete
  - do not allow deleting a user if reservation history exists
- `reservations.book_id` -> restrict delete
  - do not allow deleting a book if reservation history exists
- `issued_books.user_id` -> restrict delete
  - do not allow deleting a user if issue history exists
- `issued_books.book_id` -> restrict delete
  - do not allow deleting a book if issue history exists
- `issued_books.reservation_id` -> set null
  - if a reservation is removed later, the issue history can still remain
- `books.created_by` and `books.updated_by` -> set null
  - if an admin is removed later, keep the book record
- `issued_books.issued_by` and `issued_books.received_by` -> set null
  - preserve issue history even if the admin account is removed

In Laravel terms, examples would be:

```php
$table->foreignId('category_id')->constrained()->restrictOnDelete();
$table->foreignId('reservation_id')->nullable()->constrained()->nullOnDelete();
```

## Example Real-World Data Flow

To understand the relationship clearly, consider this example:

1. Admin creates category `Programming`
2. That category gets `categories.id = 1`
3. Admin creates a book `Laravel Basics`
4. That book row stores `category_id = 1`
5. A user named Karim registers and gets `users.id = 10`
6. Karim reserves `Laravel Basics`
7. The reservation row stores:
   - `user_id = 10`
   - `book_id = <id of Laravel Basics>`
8. Later the admin issues the book
9. A row is created in `issued_books` with:
   - `user_id = 10`
   - `book_id = <id of Laravel Basics>`
   - `reservation_id = <id of the reservation>`
10. When Karim returns the book, `return_date` is filled and status becomes `returned`

This is the main transaction flow of the system.

## Suggested Migration Order

1. `users`
2. `categories`
3. `books`
4. `reservations`
5. `issued_books`
6. `chatbot_conversations` (optional)
7. `chatbot_messages` (optional)
8. `notifications` (optional)

## Laravel Notes

- Keep Laravel's default tables for `password_resets`, `failed_jobs`, and `personal_access_tokens` unless authentication strategy changes.
- If JWT is used fully instead of Sanctum tokens, `personal_access_tokens` may become unnecessary for application auth, but it can remain without conflict.
- Add database-level foreign keys and application-level validation for stock, due dates, and duplicate active reservations.
- Consider soft deletes for `books` and `categories` only if the admin panel requires recovery of deleted records.

## Final Recommendation

For the first version of the Laravel backend, the minimum required business tables are:

- `users`
- `categories`
- `books`
- `reservations`
- `issued_books`

The following can be added in a later milestone:

- `chatbot_conversations`
- `chatbot_messages`
- `notifications`

This approach keeps the first version simpler while still matching the project proposal and allowing future expansion.
