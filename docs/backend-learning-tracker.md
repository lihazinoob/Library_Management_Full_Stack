# Backend Learning Tracker

This document tracks my serious backend engineering learning journey through the database design of the Library Management System project.

The purpose of this file is:

- to document my schema design decisions
- to record tradeoffs between different relational modeling approaches
- to preserve the reasoning behind each design
- to continue future discussions with Codex from a clear engineering baseline

## Current Learning Focus

Right now I am focusing on one of the most important backend engineering skills:

- designing database schemas carefully
- understanding relationships between entities
- comparing normalized and denormalized designs
- thinking about correctness, performance, and maintainability together

## Current Schema Progress

So far, I have created:

- `users`
- `categories`
- `books`
- `reservations`

Current relationship understanding:

- one category can contain many books
- one book belongs to one category
- therefore `books.category_id` should be a foreign key referencing `categories.category_id`

This is a standard one-to-many relationship.

## The Core Question I Explored

The important design question is:

When users reserve books, issue books, or return books, the number of available copies changes over time.

Should I store an `available_copies` column directly in the `books` table?

Example idea:

```sql
books
------
book_id
title
category_id
total_copies
available_copies
```

At first, this looks practical because the system can quickly know whether a book is currently available.

## What I Learned About `available_copies`

### Main Advantage

Storing `available_copies` in the `books` table gives fast reads.

Benefits:

- easy to show current availability
- simple queries for listing available books
- useful for dashboards and common search results
- practical when availability is checked frequently

So this design is not wrong. It is often used in real systems.

### Main Disadvantages

The important lesson is that `available_copies` is usually not a primary fact. It is derived from other business events.

Those events include:

- a book is issued
- a book is returned
- a reservation is created
- a reservation is canceled
- new copies are added
- damaged or lost copies are removed

Because of that, storing `available_copies` introduces several backend risks.

## Disadvantage 1: Risk of Inconsistency

If the application records a loan or reservation correctly but fails to update `books.available_copies`, then the stored number becomes incorrect.

Example:

- `total_copies = 5`
- currently issued copies = `2`
- so available copies should be `3`

Now another book is issued:

- a row is inserted into a loan table
- but `available_copies` is not decremented because of a bug

Then:

- transaction history says `3` copies are now issued
- real availability should be `2`
- but `books.available_copies` still says `3`

This creates conflicting truths in the database.

## Disadvantage 2: Concurrency Problems

Concurrency problems happen when multiple users perform operations at the same time.

Example:

- `available_copies = 1`
- two users try to issue the same book at nearly the same moment

Possible sequence:

1. Request A reads `available_copies = 1`
2. Request B reads `available_copies = 1`
3. Request A creates a loan
4. Request B creates a loan
5. both requests try to decrement availability

Now the system may allow two issues even though only one copy was available.

This is a race condition.

Important backend lesson:

- if I store `available_copies`, I must update it inside proper transactions
- I must also prevent the value from going below zero
- I need atomic update logic, not loose read-then-write logic

## Disadvantage 3: Redundant Data

If I already store:

- `books.total_copies`
- active loan records
- active reservation records

then `available_copies` can often be computed from those tables.

Example:

- `total_copies = 5`
- active loans = `2`
- active reservations holding copies = `1`

Then:

```text
available_copies = 5 - 2 - 1 = 2
```

If I also store `available_copies = 2` in the `books` table, then the same business meaning exists in more than one place.

That redundancy is useful for speed, but dangerous for correctness.

Another example:

- librarian adds 2 new copies
- `total_copies` changes from `5` to `7`
- but `available_copies` is not updated

Now the inventory state is wrong again.

## Disadvantage 4: Harder Debugging

When stored availability disagrees with transaction records, debugging becomes harder.

Example:

- `books.total_copies = 6`
- active loan rows imply `3` copies are issued
- expected availability should be `3`
- but `books.available_copies = 4`

Now I have to investigate:

- was a return processed twice?
- was a loan row missing?
- was `available_copies` incremented incorrectly?
- was a reservation canceled badly?
- did some code update one table but not another?

The lesson is important:

- transaction tables store the evidence
- `available_copies` stores the current answer

Evidence is slower to read but safer to trust.
The answer is faster to read but easier to corrupt.

## My Performance Concern

A natural concern is this:

If I do not store `available_copies`, then will I need several extra queries just to compute one attribute of one book?

This is a valid backend engineering concern.

If I naively do this:

- query `books`
- query `book_loans`
- query `book_reservations`
- compute availability in application code

and repeat that per book, then that is inefficient.

This creates an `N+1` query style problem.

## The Professional Approach

The professional answer is not:

- always compute availability with many separate queries

and it is also not:

- always store `available_copies` directly as the main source of truth

The professional approach is usually:

### 1. Keep Transactional Tables as the Source of Truth

Use tables such as:

- `books`
- `book_loans`
- `book_reservations`
- optionally `book_copies`

These tables represent the real events and inventory state changes.

This gives:

- auditability
- correctness
- better normalization
- easier business reasoning

### 2. Avoid Naive Per-Book Multi-Query Computation

Professionals do not usually run 2 or 3 separate queries for every single book object.

Instead, they compute availability with:

- one aggregate SQL query
- joins
- grouped counts
- proper indexes

So the comparison should be:

- stored derived field

vs

- efficient aggregate query

not

- stored field

vs

- many repeated extra queries

### 3. Use Aggregate Queries

Availability can often be computed in one SQL query using joins and counts.

Example pattern:

```sql
SELECT
    b.book_id,
    b.title,
    b.total_copies,
    b.total_copies
      - COUNT(DISTINCT l.loan_id)
      - COUNT(DISTINCT r.reservation_id) AS available_copies
FROM books b
LEFT JOIN book_loans l
    ON l.book_id = b.book_id
   AND l.status = 'ISSUED'
LEFT JOIN book_reservations r
    ON r.book_id = b.book_id
   AND r.status = 'ACTIVE'
WHERE b.book_id = 1
GROUP BY b.book_id, b.title, b.total_copies;
```

This is still computed availability, but it avoids many separate queries.

## Important Performance Principle

If availability is computed from other tables, indexing becomes very important.

Examples:

- index on `book_loans(book_id, status)`
- index on `book_reservations(book_id, status)`

With proper indexes, counting active records becomes much cheaper.

## Real Professional Tradeoff

A strong backend engineer thinks in this order:

1. model the truth correctly
2. query it efficiently
3. optimize only when needed

That means:

- start with normalized transactional modeling
- compute availability with aggregate queries
- add indexes
- measure performance
- only then denormalize if the system actually needs it

## When Storing `available_copies` Is Acceptable

Storing `available_copies` is acceptable when:

- availability is read very frequently
- aggregate queries become a performance bottleneck
- the team can enforce transactional updates safely
- the field is treated as derived state, not the only source of truth

If stored, then good backend discipline requires:

- updates inside the same transaction as loan/reservation/return changes
- constraints like preventing negative availability
- periodic reconciliation against transaction history

This means denormalization is an optimization, not the conceptual foundation of the design.

## My Current Recommended Learning Path

To learn serious backend engineering properly, the best sequence is:

### Stage 1: Normalized Design First

Design:

- `books`
- `book_loans`
- `reservations`

Store:

- stable inventory facts like `total_copies`
- transaction history for issue, return, and reservation operations

At this stage, compute current availability from transaction tables.

### Stage 2: Learn Efficient SQL

Practice:

- joins
- aggregate queries
- `GROUP BY`
- filtering active records by status
- indexing for performance

This stage teaches real backend database thinking.

### Stage 3: Add Denormalized Optimization Later

If performance later becomes important, add:

- `books.available_copies`

But only as:

- a derived field
- updated transactionally
- validated against source-of-truth tables

This stage teaches production tradeoffs.

## My Current Working Conclusion

For learning database design seriously:

- I should first model books, loans, and reservations in a normalized way
- I should understand how to compute availability with SQL
- I should not jump too early into storing a derived field unless I understand the consistency cost

For real production systems:

- both approaches can be valid
- the better choice depends on correctness needs, traffic patterns, and operational complexity

The most professional mindset is:

- correctness first
- performance second
- denormalization only with clear intent

## What I Have Implemented So Far

In the SQL schema, I have currently implemented these tables:

- `users`
- `categories`
- `books`
- `reservations`

### Implemented `books` Table

The current `books` relation includes:

- `book_id` as the primary key
- `category_id` as a foreign key to `categories`
- bibliographic data such as `title`, `author`, `isbn`, `publisher`, `publication_year`, `edition`, and `language`
- descriptive metadata like `description` and `cover_image_url`
- inventory metadata such as `total_copies` and `shelf_location`
- `status`
- `created_by` as a foreign key to `users`
- `created_at` and `updated_at`

Important design lesson:

- `total_copies` is a stable inventory fact
- `status` may become problematic if I try to use it as a real-time availability flag

### Implemented `reservations` Table

The current `reservations` relation includes:

- `reservation_id` as the primary key
- `user_id` as a foreign key to `users`
- `book_id` as a foreign key to `books`
- unique `reservation_code`
- `reserved_at`
- `expires_at`
- `status`
- `created_at`
- `updated_at`

Current reservation statuses in the SQL file are:

- `ACTIVE`
- `CANCELLED`
- `EXPIRED`

Important design lesson:

- this relation models reservations at the `book` level
- it does not model reservations at the `copy` level

That means the current schema can answer:

- how many reservations a book has

But it cannot answer:

- which exact copy is reserved
- how many reservations belong to copy 1, copy 2, or copy 3 of the same book

## What I Understood About My Current Reservation Design

My current schema stores:

- one `books` row for a book title or logical book record
- one integer `total_copies` for how many copies exist
- multiple reservation rows pointing to `books.book_id`

This means reservations are attached to the book as a whole, not to individual physical copies.

Example:

- `books.book_id = 1`
- `books.total_copies = 5`
- `reservations` has 3 rows with `book_id = 1`

This means:

- the book has 3 reservations

It does not mean:

- copy 1 has 1 reservation
- copy 2 has 2 reservations

That level of tracking is impossible with the current schema because there is no `book_copies` table.

## What I Learned About the N+1 Query Problem in My Schema

Suppose I want to fetch all books with their reservation counts.

The wrong backend approach is:

1. fetch all rows from `books`
2. for each book, run another query to count reservations

Example logic:

- one query to fetch all books
- then one query per book like:

```sql
SELECT COUNT(*)
FROM reservations
WHERE book_id = ? AND status = 'ACTIVE';
```

If there are 100 books, then the application does:

- 1 query for books
- 100 more queries for reservation counts

This is the N+1 query problem.

The better approach is one aggregate query:

```sql
SELECT
    b.book_id,
    b.title,
    COUNT(r.reservation_id) AS active_reservation_count
FROM books b
LEFT JOIN reservations r
    ON r.book_id = b.book_id
   AND r.status = 'ACTIVE'
GROUP BY b.book_id, b.title;
```

Key lesson:

- the join creates repeated book rows for matching reservations
- `GROUP BY` collapses them back into one row per book
- `COUNT(r.reservation_id)` gives the reservation count per book
- `LEFT JOIN` ensures books with zero reservations still appear

## Professional Interpretation of My Current Model

For many library systems, reserving at the book level is a reasonable business rule.

That means:

- a user reserves the book title
- not a specific physical copy
- when any valid copy becomes available, the reservation can be fulfilled

So my current design is not wrong.

It simply supports one business model:

- reservation-at-book-level

It does not yet support:

- reservation-at-copy-level

## What To Implement Next

The next implementation steps should be:

- create a `book_loans` table to model book issue and return flows
- decide whether `books.status` should remain, or whether it should be changed to a broader catalog-state field
- add indexes on important foreign keys and query paths
- add stronger constraints such as checking that `expires_at > reserved_at`
- decide whether duplicate active reservations for the same user and book should be allowed
- write and practice aggregate queries for:
  - books with reservation counts
  - books with available copies
  - users with active reservations
- decide whether the system truly needs a `book_copies` table

## Decision About `book_copies`

I should add a `book_copies` table only if my business logic needs to track individual physical copies.

Example cases where `book_copies` becomes necessary:

- each copy has its own barcode
- each copy can be damaged, lost, or archived separately
- each copy may live in a different shelf location
- a reservation or loan must reference a specific physical copy

If my business only needs:

- total number of copies
- reservation counts per book
- issue and return counts per book

then `total_copies` in `books` may be enough for now.

## Immediate Backend Learning Roadmap

My immediate backend learning roadmap is:

1. review the current schema critically after every table addition
2. implement `book_loans`
3. learn aggregate queries deeply using my own schema
4. learn indexing for the most common backend query patterns
5. understand transactions for reservation and issue workflows
6. decide later whether to denormalize availability or introduce `book_copies`

## Next Learning Topics

The next topics I want to explore in this backend journey are:

- designing `book_loans`
- deciding the real meaning of `books.status`
- deciding whether a filtered unique rule is needed for active reservations
- deciding whether I need a `book_copies` table
- learning when to use `total_copies` only vs per-copy tracking
- writing efficient queries to compute reservation and availability metrics
- learning how transactions protect correctness during reservation, issue, and return flows

## Notes for Future Discussion with Codex

In future conversations, this file should be used as my learning context.

Codex should help me continue this journey by:

- challenging weak schema assumptions
- comparing beginner-friendly and professional approaches
- explaining tradeoffs with concrete examples
- helping me evolve from correct schema design to production-safe backend design
