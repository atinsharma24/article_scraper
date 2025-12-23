# Supabase Schema (Current)

This document explains the current Supabase Postgres schema being used by this project.

## High-level model

This project’s source of truth for schema is the Laravel migrations in `backend/database/migrations/`.

In Supabase, the `public` schema currently contains:

- Application domain table:
  - `articles`
- Standard Laravel infrastructure tables (created by default Laravel migrations):
  - `users`
  - `password_reset_tokens`
  - `sessions`
  - `jobs`
  - `job_batches`
  - `failed_jobs`
  - `cache`
  - `cache_locks`
  - `migrations`

Even if some of these tables have `0` rows right now, they are not automatically “redundant” — Laravel may rely on them depending on how you configure cache/session/queue/auth.

## Table-by-table details

### `articles` (core domain)

**Purpose**

Stores both original and updated articles.

**Rows (currently)**: 6

**Key columns**

- `id` (PK)
  - bigint sequence
- `type` (text)
  - Values used by the app: `original` and `updated`
- `parent_id` (nullable FK → `articles.id`)
  - For updated articles, points at the original article row
  - For original articles, is `NULL`
- `title` (text)
- `slug` (nullable text)
- `content` (text)
  - Stores HTML content
- `source_url` (nullable text)
  - For originals: source URL on BeyondChats
  - For updated: competitor source URL is not necessarily stored here (depends on pipeline)
- `published_at` (nullable timestamptz)
- `references` (nullable jsonb)
  - Structured reference list (e.g. `[{"url": "...", "title": "..."}]`)
- `created_at`, `updated_at` (timestamptz)

**Indexes & constraints (from Laravel migration)**

Laravel defines (see `backend/database/migrations/2025_12_21_172721_create_articles_table.php`):

- `unique(source_url)`
  - Important: if you intend to store multiple rows with the same `source_url` (e.g. updated articles that reuse the original URL), this constraint would conflict. In practice, you typically store updated articles with a different URL (or leave `source_url` null).
- `index(type, parent_id)`
  - Supports queries like:
    - list originals (`type=original`)
    - list updates for an original (`parent_id=<id>`)
- `index(created_at)`

**Notes**

- The `articles.parent_id` foreign key has a Supabase performance lint suggesting it is “unindexed”. You already have `index(type, parent_id)`. Some linters expect an index on `parent_id` alone; your composite index may still be sufficient for your query patterns.

### `migrations` (Laravel infrastructure)

**Purpose**

Tracks which Laravel migrations have been applied to the database.

**Why it matters**

Laravel uses this to decide what migrations need to run. Do not delete/modify this table manually.

### `users` (Laravel infrastructure)

**Purpose**

Default Laravel users table.

**Used?**

This project can run without user login features, but the table exists because it’s part of Laravel’s default migrations.

If you ever add authentication/admin screens, this table becomes important.

### `password_reset_tokens` (Laravel infrastructure)

**Purpose**

Stores password reset tokens for users (if password reset flows are enabled).

### `sessions` (Laravel infrastructure)

**Purpose**

Stores session state when `SESSION_DRIVER=database`.

If you instead use `SESSION_DRIVER=file` (or `cookie`), this table may remain unused.

### `jobs`, `job_batches`, `failed_jobs` (Laravel queue infrastructure)

**Purpose**

Used when `QUEUE_CONNECTION=database`.

If you use `QUEUE_CONNECTION=sync` (no queue) or a non-database driver, these tables may remain unused.

### `cache`, `cache_locks` (Laravel cache infrastructure)

**Purpose**

Used when `CACHE_STORE=database`.

If you use `CACHE_STORE=file`, `redis`, or `array`, these tables may remain unused.

## Supabase security & RLS (important context)

Supabase security tooling reports:

- “RLS disabled in public” on most/all `public` tables.

This is only a real issue if your application exposes these tables directly via Supabase PostgREST using anon/public keys.

In this project’s architecture, Laravel is the API boundary and talks to Postgres using DB credentials. In that model:

- RLS can remain disabled (common)
- You should protect access at the Laravel API level

If you later add a Supabase client directly in the frontend (anon key), you should enable RLS and author policies.

## Why we are not dropping any tables/columns

Per your instruction we are keeping the schema unchanged.

In general, dropping “unused” Laravel infrastructure tables is only safe if you also lock the app configuration to drivers that do not depend on them (sessions/cache/queue/auth). Otherwise, it can break runtime behavior.
