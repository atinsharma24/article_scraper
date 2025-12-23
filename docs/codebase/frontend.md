# Frontend (React + Vite)

Location: `frontend/`

## Purpose

The frontend is a small React app that:
- Lists **original** articles from the backend.
- Lets the user pick an original article.
- Shows the **original** content and the **latest updated** version side-by-side.

## Data Flow

1. Read `VITE_API_BASE_URL` from Vite environment.
2. Fetch `/api/articles?type=original` (paginated) to populate the sidebar.
3. Fetch `/api/articles/:id` to retrieve the selected original plus its `updates` relation.
4. Compute “latest update” client-side from `updates`.
5. Render HTML returned by the backend/pipeline.

## Files

### src/vite-env.d.ts

Why it exists:
- Gives TypeScript the correct shape for `import.meta.env`.

Key types:
- `ImportMetaEnv.VITE_API_BASE_URL?: string` — backend base URL used by the API client.

### src/api.ts

Purpose:
- Minimal typed HTTP client for the Laravel API.

Key functions:
- `getApiBaseUrl()`
  - Reads `import.meta.env.VITE_API_BASE_URL`, trims it, removes a trailing slash.
  - Validates it is an absolute `http(s)` URL.
  - Throws a clear error if missing/invalid.

- `requestJson<T>(pathOrUrl)`
  - Builds a full URL using `getApiBaseUrl()` when given a relative path.
  - Uses `fetch`.
  - Returns `null` on HTTP 204, otherwise parses JSON.
  - Throws on non-2xx responses (includes response body text when available).

- `listArticles(options)`
  - Builds `/api/articles` URL with optional query params:
    - `type` (`original` | `updated`)
    - `parent_id` (for fetching updates of a specific original)
    - `per_page`
  - Returns `Paginated<ArticleIndexItem>`.

- `getArticle(id)`
  - Fetches `/api/articles/:id`.
  - Returns `ArticleWithUpdates`.

### src/types/index.ts

Purpose:
- Shared type contracts between UI and API responses.

Key types:
- `Reference` — `{ url: string; title: string | null }`.
- `Article` — base article shape (matches backend JSON fields used by UI).
- `ArticleIndexItem` — `Article` plus optional `updates_count` (added by backend in index for originals).
- `ArticleWithUpdates` — `Article` plus optional `updates: Article[]` (added by backend `show()` via Eloquent relation).
- `Paginated<T>` — Laravel paginator shape (UI relies primarily on `data`).
- `ListArticlesOptions` — arguments for `listArticles`.

### src/App.tsx

Purpose:
- Main UI component.

Key helpers:
- `fmtDate(value)`
  - Defensive date formatting. Returns `null` if invalid.

- `pickLatestUpdate(updates)`
  - Picks the newest update by `created_at` without sorting the whole array.

Key behaviors:
- On mount:
  - Loads the first page of originals.
  - Auto-selects the first original that already has updates (otherwise selects the first).
- On selection change:
  - Loads the article details and keeps `updates` in state.
- Rendering:
  - Sidebar list with “Updated/Pending” badge.
  - Two panes: original HTML and latest updated HTML.

Note:
- Rendering uses `dangerouslySetInnerHTML` because the backend/pipeline stores and returns HTML.

### src/main.tsx

Purpose:
- React entry point that mounts `App`.

### src/index.css

Purpose:
- Global base styles (Vite template defaults). Controls light/dark defaults.

### src/App.css

Purpose:
- Layout and component-level styling for the app.
- Handles responsive behavior (single-column panes on small screens).
