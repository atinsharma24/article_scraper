# Backend (Laravel API)

Location: `backend/`

## Purpose

The backend is a Laravel API that:
- Stores `articles` (original and updated).
- Exposes endpoints for the frontend to list and view articles.
- Exposes endpoints for the pipeline to create originals/updates.

The backend is deployed to Render as a web service.

## API Overview

Routes live in `backend/routes/api.php`.

- `GET /api/health`
  - Simple uptime/health endpoint.

- `GET /api/articles`
  - Paginated listing.
  - Supports query params:
    - `type=original|updated`
    - `parent_id=<id>`
    - `per_page=<1..100>`
  - For `type=original` (and no `parent_id`), includes `updates_count` for each original.

- `GET /api/articles/{id}`
  - Returns the article plus its `updates` relation.

- `POST /api/articles`
  - Creates an `original` or `updated` article depending on payload.

- `PATCH /api/articles/{id}`
  - Updates an article.

- `DELETE /api/articles/{id}`
  - Deletes an article.

- `GET /api/articles/exists?source_url=...`
  - Convenience endpoint for “dedupe” checks.

- `GET /api/articles/latest-original-needing-update`
  - Returns the newest original with no updates.
  - Returns HTTP 204 when there is no work.

## Key files

### app/Models/Article.php

Purpose:
- Eloquent model for the `articles` table.

Important properties:
- `$fillable`
  - Allows mass assignment for: `type`, `parent_id`, `title`, `slug`, `content`, `source_url`, `published_at`, `references`.

- `$casts`
  - `published_at` → `datetime`
  - `references` → `array` (stored as JSON in DB)

Relations:
- `parent()`
  - `BelongsTo` self relation via `parent_id`.

- `updates()`
  - `HasMany` self relation for `type=updated` articles under the original.
  - Ordered by `created_at desc`.

### app/Http/Controllers/Api/ArticleController.php

Purpose:
- Implements CRUD and helper endpoints for articles.

Methods:
- `exists(Request $request)`
  - Validates presence of `source_url` query param.
  - Looks up the first matching article.
  - Returns `{ exists: false }` or `{ exists: true, id, type, parent_id }`.

- `index()`
  - Builds a query with optional `type` and `parent_id` filtering.
  - For listing originals, also uses `withCount('updates')` so the UI can show status.
  - Paginates with `per_page` clamped to `[1..100]`.

- `store(StoreArticleRequest $request)`
  - Creates the article from validated input.
  - On unique constraint violation (usually duplicate `source_url`), returns HTTP 409 with the existing article.

- `show(string $id)`
  - Loads article and eager-loads `updates`.

- `update(UpdateArticleRequest $request, string $id)`
  - Updates fields based on validated input.

- `destroy(string $id)`
  - Deletes the article.

- `latestOriginalNeedingUpdate()`
  - Finds the newest `original` with no `updates`.
  - Returns HTTP 204 if none found.

### app/Http/Requests/StoreArticleRequest.php

Purpose:
- Request validation for creating articles.

Rules:
- Base:
  - `type` required (`original|updated`)
  - `title`, `content` required
  - `slug`, `published_at` optional

- For `type=original`:
  - `source_url` required URL
  - `parent_id` nullable
  - `references` nullable

- For `type=updated`:
  - `parent_id` required and must exist
  - `references` required array of size 2, with `url` and optional `title`

### app/Http/Requests/UpdateArticleRequest.php

Purpose:
- Request validation for updating articles.

Behavior:
- Uses `sometimes` rules so partial updates are allowed.

### app/Http/Middleware/CorsMiddleware.php

Purpose:
- Adds CORS headers allowing the frontend to call the API.

Behavior:
- Reads `FRONTEND_URL` env var as a comma-separated allow-list.
- If `FRONTEND_URL=*`, allows all origins.
- Handles preflight `OPTIONS` with HTTP 204.

### routes/api.php

Purpose:
- Declares all API routes.

### routes/web.php

Purpose:
- Provides a simple JSON landing response at `/` including key endpoint URLs.

### app/Console/Commands/ScrapeOldestBeyondChatsArticles.php

Purpose:
- A Laravel console command to ingest BeyondChats originals directly from the backend runtime.

Key methods:
- `handle()`
  - Orchestrates listing scrape, per-article scrape, and DB upsert.

- `fetchHtml(url)`
  - Uses Laravel HTTP client with retries.

- `discoverLastPageUrl(baseUrl, listingHtml)`
  - Similar page-number discovery as the pipeline.

- `extractArticleUrls(pageUrl, html)`
  - Filters listing links to blog post URLs.

- `scrapeArticle(url)`
  - Uses `DOMDocument`/XPath to extract title/content/published time.

Note:
- This command is optional; the primary ingestion path for the assignment is via the TypeScript pipeline + GitHub Actions.
