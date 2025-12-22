# Complete Codebase Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Directory Structure](#directory-structure)
4. [Backend (Laravel)](#backend-laravel)
5. [Pipeline (Node.js)](#pipeline-nodejs)
6. [Frontend (React)](#frontend-react)
7. [Data Flow](#data-flow)
8. [Functions Reference](#functions-reference)
9. [Deployment](#deployment)

---

## Project Overview

**BeyondChats TPM Assignment** is a full-stack content pipeline application that:
1. Scrapes original articles from BeyondChats.com
2. Searches for competitor articles using Google (via SerpAPI)
3. Rewrites original articles using AI (OpenAI or Gemini LLM)
4. Displays both original and updated versions side-by-side

### Technology Stack
- **Database**: PostgreSQL (Supabase) in production, SQLite for local development
- **Backend API**: Laravel 12 (PHP 8.3+)
- **Pipeline**: Node.js scripts with external API integrations
- **Frontend**: React 19 + Vite
- **Deployment**: 
  - Backend: Render
  - Frontend: Vercel
  - Pipeline: GitHub Actions (scheduled every 6 hours)

---

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│  GitHub Actions │  ← Scheduled pipeline (every 6 hours)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    PIPELINE (Node.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   SerpAPI    │→ │   Scraper    │→ │  LLM Rewriter   │   │
│  │ (Google      │  │ (Extract     │  │ (OpenAI/Gemini) │   │
│  │  Search)     │  │  Articles)   │  │                 │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
                  ┌──────────────┐
                  │   Laravel    │  ← REST API
                  │   Backend    │
                  └──────┬───────┘
                         │
                  ┌──────▼───────┐
                  │  PostgreSQL  │  ← Database (Supabase)
                  │  or SQLite   │
                  └──────────────┘
                         ▲
                         │
                  ┌──────┴───────┐
                  │    React     │  ← Frontend UI
                  │   Frontend   │
                  └──────────────┘
```

### Component Responsibilities

#### Backend (Laravel)
- **Purpose**: Provides REST API for CRUD operations on articles
- **Responsibilities**:
  - Store original and updated articles
  - Track relationships between originals and updates
  - Serve article data to frontend
  - Provide endpoint to find articles needing updates

#### Pipeline (Node.js)
- **Purpose**: Automated content processing workflow
- **Responsibilities**:
  - Seed original articles from BeyondChats.com
  - Find competitor articles via Google search
  - Scrape competitor content
  - Rewrite articles using LLM
  - Publish updated articles to backend

#### Frontend (React)
- **Purpose**: User interface for viewing articles
- **Responsibilities**:
  - Display list of original articles
  - Show original and updated versions side-by-side
  - Highlight articles with/without updates
  - Render HTML content and references

---

## Directory Structure

```
article_scraper/
├── backend/                    # Laravel API
│   ├── app/
│   │   ├── Console/           # CLI commands
│   │   ├── Http/
│   │   │   ├── Controllers/   # API controllers
│   │   │   ├── Middleware/    # CORS, etc.
│   │   │   └── Requests/      # Form validation
│   │   ├── Models/            # Eloquent models
│   │   └── Providers/         # Service providers
│   ├── config/                # Configuration files
│   ├── database/
│   │   └── migrations/        # Database schema
│   ├── routes/
│   │   └── api.php           # API routes
│   ├── composer.json         # PHP dependencies
│   └── package.json          # For Vite (asset bundling)
│
├── pipeline/                  # Node.js content pipeline
│   ├── src/
│   │   ├── services/         # External API integrations
│   │   │   ├── laravelApi.js    # Backend API client
│   │   │   ├── llm.js           # OpenAI/Gemini integration
│   │   │   ├── scrape.js        # Article extraction
│   │   │   └── serpapi.js       # Google search
│   │   ├── utils/            # Shared utilities (NEW)
│   │   │   ├── env.js           # Environment helpers
│   │   │   └── html.js          # HTML formatting
│   │   ├── run-once.js       # Main pipeline script
│   │   ├── run-mock.js       # Mock pipeline (no APIs)
│   │   ├── seed-local.js     # Seed sample data
│   │   └── seed-originals.js # Scrape BeyondChats articles
│   └── package.json          # Node.js dependencies
│
├── frontend/                  # React UI
│   ├── src/
│   │   ├── App.jsx           # Main application component
│   │   ├── api.js            # Backend API client
│   │   ├── main.jsx          # Entry point
│   │   ├── App.css           # Application styles
│   │   └── index.css         # Global styles
│   ├── index.html            # HTML template
│   ├── package.json          # Node.js dependencies
│   └── vite.config.js        # Vite configuration
│
├── docs/                      # Documentation
├── diagrams/                  # Architecture diagrams
└── .github/workflows/         # GitHub Actions
```

---

## Backend (Laravel)

### Overview
The backend is a Laravel 12 REST API that manages article storage and retrieval. It uses PostgreSQL (Supabase) in production and SQLite for local development.

### Database Schema

#### Articles Table
```sql
CREATE TABLE articles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    type VARCHAR(50) NOT NULL,           -- 'original' or 'updated'
    parent_id BIGINT NULL,               -- Foreign key to parent article (for updates)
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NULL,
    content TEXT NOT NULL,               -- HTML content
    source_url VARCHAR(1000) NULL UNIQUE,-- Source URL (originals only)
    references JSON NULL,                -- Array of {url, title} references
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    INDEX idx_type (type),
    INDEX idx_parent_id (parent_id),
    INDEX idx_created_at (created_at)
);
```

### Models

#### Article Model (`app/Models/Article.php`)

**Purpose**: Eloquent ORM model representing an article

**Properties**:
- `fillable`: Mass-assignable fields
- `casts`: Type casting (published_at → datetime, references → array)

**Relationships**:
- `parent()`: BelongsTo relationship - links updated articles to original
- `updates()`: HasMany relationship - links original to all its updates

**Example**:
```php
$article = Article::find(1);
$originalArticle = $article->parent;  // Get parent if this is an update
$allUpdates = $article->updates;      // Get all updates if this is an original
```

### Controllers

#### ArticleController (`app/Http/Controllers/Api/ArticleController.php`)

**Purpose**: Handle HTTP requests for article operations

**Methods**:

1. **`index()`** - List articles with filtering
   - Query params: `type` (original|updated), `parent_id`, `per_page` (max 100)
   - Includes `updates_count` for original articles
   - Returns paginated results ordered by `created_at DESC`

2. **`store(StoreArticleRequest $request)`** - Create new article
   - Validates incoming data
   - Handles duplicate `source_url` with 409 Conflict response
   - Returns created article with 201 status

3. **`show(string $id)`** - Get single article with updates
   - Eager loads `updates` relationship
   - Returns article JSON or 404

4. **`update(UpdateArticleRequest $request, string $id)`** - Update article
   - Validates input
   - Updates and returns modified article

5. **`destroy(string $id)`** - Delete article
   - Removes article from database
   - Returns 204 No Content

6. **`latestOriginalNeedingUpdate()`** - Get oldest original without updates
   - Used by pipeline to select next article to process
   - Returns article JSON or 204 if none found
   - Query: `type='original' AND NOT EXISTS (SELECT * FROM articles WHERE parent_id=id)`

7. **`exists(Request $request)`** - Check if article exists by source_url
   - Query param: `source_url`
   - Returns: `{exists: boolean, id?, type?, parent_id?}`

### API Routes (`routes/api.php`)

```php
// Health check (no DB)
GET /api/health

// Articles CRUD
GET    /api/articles              # List articles
POST   /api/articles              # Create article
GET    /api/articles/{id}         # Get article with updates
PUT    /api/articles/{id}         # Update article
DELETE /api/articles/{id}         # Delete article

// Custom endpoints
GET /api/articles/latest-original-needing-update  # For pipeline
GET /api/articles/exists?source_url={url}         # Check existence
```

### Request Validation

#### StoreArticleRequest
- `type`: required, in:original,updated
- `parent_id`: nullable, exists:articles,id
- `title`: required, string, max:500
- `slug`: nullable, string, max:500
- `content`: required, string
- `source_url`: nullable, string, max:1000, unique:articles
- `references`: nullable, array
- `published_at`: nullable, date

#### UpdateArticleRequest
Similar to StoreArticleRequest but all fields are optional

### Middleware

#### CorsMiddleware (`app/Http/Middleware/CorsMiddleware.php`)
- Handles Cross-Origin Resource Sharing
- Allows requests from frontend domain
- Sets headers: Access-Control-Allow-Origin, Access-Control-Allow-Methods, etc.

---

## Pipeline (Node.js)

### Overview
The pipeline is a collection of Node.js scripts that automate the content workflow. Scripts can run locally or in GitHub Actions.

### Utilities (Shared Code)

#### `utils/env.js`

**Purpose**: Centralized environment variable handling

**Functions**:

1. **`requireEnv(name)`**
   - **Parameters**: `name` (string) - Environment variable name
   - **Returns**: String value
   - **Throws**: Error if variable not set
   - **Usage**: `const apiKey = requireEnv('SERPAPI_API_KEY')`

2. **`parseMaxUpdatesPerRun()`**
   - **Parameters**: None (reads from `process.env.MAX_UPDATES_PER_RUN`)
   - **Returns**: Number (default: 1, range: 1+)
   - **Usage**: Controls how many articles to process in one pipeline run

3. **`parseMaxCompetitorChars()`**
   - **Parameters**: None (reads from `process.env.MAX_COMPETITOR_CHARS`)
   - **Returns**: Number (default: 12000, min: 100)
   - **Usage**: Limits competitor article text sent to LLM

#### `utils/html.js`

**Purpose**: HTML formatting utilities

**Functions**:

1. **`generateCitationsHtml(references)`**
   - **Parameters**: `references` - Array of `{url, title}` objects
   - **Returns**: HTML string with formatted citations
   - **Usage**: Appends references section to updated articles
   - **Example**:
     ```javascript
     const refs = [
       {url: 'https://example.com/1', title: 'Article 1'},
       {url: 'https://example.com/2', title: 'Article 2'}
     ];
     const html = generateCitationsHtml(refs);
     // Returns: <hr/><h2>References</h2><ul><li>...</li></ul>
     ```

### Services

#### `services/laravelApi.js`

**Purpose**: Client for communicating with Laravel backend

**Functions**:

1. **`fetchLatestOriginalNeedingUpdate()`**
   - **Returns**: Promise<Article | null>
   - **Endpoint**: GET /api/articles/latest-original-needing-update
   - **Usage**: Get next article for pipeline to process

2. **`publishUpdatedArticle(payload)`**
   - **Parameters**: `payload` - Article data object
   - **Returns**: Promise<Article>
   - **Endpoint**: POST /api/articles
   - **Usage**: Save rewritten article to backend

3. **`publishOriginalArticle(payload)`**
   - **Parameters**: `payload` - Article data object
   - **Returns**: Promise<Article>
   - **Endpoint**: POST /api/articles
   - **Usage**: Save scraped original article

**Internal Helper**: `fetchWithRetry(url, options, {retries, timeoutMs})`
- Implements exponential backoff for failed requests
- Retries on timeout errors
- Default: 2 retries, 120s timeout

#### `services/serpapi.js`

**Purpose**: Google search integration via SerpAPI

**Functions**:

1. **`googleTopCompetitors(query, {limit})`**
   - **Parameters**: 
     - `query` (string): Search query (usually article title)
     - `limit` (number): Max results to return (default: 10)
   - **Returns**: Promise<Array<{url, title}>>
   - **API**: https://serpapi.com/search.json
   - **Filtering**:
     - Excludes beyondchats.com and social media
     - Only returns article-like URLs
     - Skips PDFs, category pages, etc.

**Internal Helpers**:
- `isDisallowedDomain(url)`: Filters out blocked domains
- `looksLikeArticle(url)`: Validates URL structure

#### `services/scrape.js`

**Purpose**: Extract article content from web pages

**Functions**:

1. **`extractMainArticle(url)`**
   - **Parameters**: `url` (string) - Article URL
   - **Returns**: Promise<{title, text, html}>
   - **Library**: @extractus/article-extractor
   - **Fallback**: Direct fetch + html-to-text if extractor fails
   - **Usage**: Get clean article content from competitor URLs

**Process**:
1. Try article-extractor with custom headers
2. If empty, convert HTML to plain text
3. If still empty, fetch directly and parse

#### `services/llm.js`

**Purpose**: AI-powered article rewriting using LLM APIs

**Functions**:

1. **`rewriteWithLlm({originalTitle, originalHtml, competitorA, competitorB})`**
   - **Parameters**:
     - `originalTitle`: String
     - `originalHtml`: HTML string
     - `competitorA`: {url, title, text}
     - `competitorB`: {url, title, text}
   - **Returns**: Promise<{title, html}>
   - **Providers**: OpenAI or Gemini (set via `LLM_PROVIDER` env var)
   - **Models**:
     - OpenAI: gpt-4o-mini (default)
     - Gemini: gemini-2.5-flash (default)

**Prompt Strategy**:
- System: Instructions to avoid plagiarism, preserve meaning
- User: Original content + competitor excerpts + task description
- Output: Markdown (converted to HTML via marked.js)

**Error Handling**:
- Detects quota/billing errors
- Provides actionable error messages
- Gracefully handles model not found (404)

**Internal Functions**:
- `rewriteWithOpenAi()`: OpenAI API integration
- `rewriteWithGemini()`: Google Generative Language API integration
- `getProvider()`: Validates LLM_PROVIDER setting

### Scripts

#### `run-once.js`

**Purpose**: Main pipeline - processes one or more original articles

**Environment Variables**:
- `API_BASE_URL`: Backend URL (required)
- `SERPAPI_API_KEY`: SerpAPI key (required)
- `LLM_API_KEY`: LLM API key (required)
- `LLM_PROVIDER`: openai|gemini (optional, default: gemini)
- `LLM_MODEL`: Model name (optional)
- `MAX_UPDATES_PER_RUN`: Number of articles to process (default: 1)
- `MAX_COMPETITOR_CHARS`: Max chars from competitors (default: 12000)

**Workflow**:
1. Load configuration from environment
2. Loop `MAX_UPDATES_PER_RUN` times:
   a. Fetch oldest original article without updates
   b. Search Google for competitor articles (query = article title)
   c. Scrape 2 competitor articles
   d. Send to LLM for rewriting
   e. Append citations
   f. Publish updated article to backend
3. Exit with success if all updates succeed

**Functions**:

1. **`pickAndScrapeTwoCompetitors(query)`**
   - Fetches 20 candidate URLs from Google
   - Attempts to scrape each until 2 succeed
   - Returns: Array of 2 scraped articles with metadata
   - Throws: If unable to get 2 valid articles

**Error Handling**:
- Catches quota errors and provides remediation steps
- Continues to next article if one fails
- Exits with code 1 if any failures occur

#### `run-mock.js`

**Purpose**: Mock pipeline for testing without external APIs

**Environment Variables**:
- `API_BASE_URL`: Backend URL (required only)

**Workflow**:
1. Fetch one original article
2. Use mock competitor data (example.com URLs)
3. Apply simple HTML transformations (color headers)
4. Append mock citations
5. Publish to backend

**Use Case**: Testing/development without SerpAPI or LLM API keys

#### `seed-local.js`

**Purpose**: Seed database with sample articles for testing

**Environment Variables**:
- `API_BASE_URL`: Backend URL (required)

**Data**: 3 hardcoded sample articles about customer support topics

**Workflow**:
1. Iterate through sample articles
2. POST each to backend API
3. Report success/failure count

**Use Case**: Quick local setup without external API calls

#### `seed-originals.js`

**Purpose**: Scrape real articles from BeyondChats.com and seed them

**Environment Variables**:
- `API_BASE_URL`: Backend URL (required)
- `SEED_COUNT`: Number of articles to scrape (default: 5)
- `RESET_SEED`: true|false - Delete all existing articles first

**Workflow**:
1. Fetch BeyondChats.com blog listing page
2. Discover pagination (last page URL)
3. Extract article URLs from last page
4. Scrape each article's content
5. Save to backend as original articles

**Functions**:

1. **`fetchHtml(url)`** - Fetch raw HTML
2. **`toAbsoluteUrl(baseUrl, href)`** - Convert relative to absolute URLs
3. **`discoverLastPageUrl(baseUrl, html)`** - Find last pagination page
4. **`extractArticleUrls(pageUrl, html)`** - Parse article links
5. **`isLikelyBlogPostUrl(url)`** - Validate URL pattern
6. **`fetchExistingOriginalSourceUrls()`** - Get existing source URLs (avoid duplicates)
7. **`listArticlesByType(type)`** - List all articles of a type
8. **`deleteArticleById(id)`** - Delete single article
9. **`resetAllArticles()`** - Delete all articles (if RESET_SEED=true)
10. **`slugFromUrl(url)`** - Extract slug from URL path

**Use Case**: Populate production database with real BeyondChats articles

---

## Frontend (React)

### Overview
The frontend is a React 19 application built with Vite. It provides a clean UI to browse original articles and their updated versions.

### Components

#### `main.jsx`

**Purpose**: Application entry point

**Code**:
```javascript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

#### `App.jsx`

**Purpose**: Main application component - manages state and renders UI

**State**:
- `originals`: Array of original articles
- `selectedId`: Currently selected article ID
- `selectedOriginal`: Full original article with updates
- `updates`: Array of updates for selected article
- `loading`: Boolean loading state
- `error`: Error message string

**Effects**:

1. **Load originals on mount**
   - Fetches first 20 original articles
   - Auto-selects first article with updates (or first article)
   - Handles loading/error states

2. **Load article details when selection changes**
   - Fetches full article data with updates
   - Updates selectedOriginal and updates state

**Computed Values**:
- `latestUpdate`: Most recent update (by created_at)

**Helper Functions**:

1. **`fmtDate(value)`**
   - Formats ISO date string to locale string
   - Returns null for invalid dates

2. **`pickLatestUpdate(updates)`**
   - Sorts updates by created_at DESC
   - Returns most recent update or null

**UI Structure**:
```
<div className="layout">
  <header>            # App title and API URL
  <main>
    <aside>           # Sidebar - list of originals
      <ul>
        {originals.map(article => 
          <button>    # Article item with badge (Updated/Pending)
        )}
      </ul>
    </aside>
    <section>         # Content area - two panes
      <article>       # Left pane - original
      <article>       # Right pane - updated (or "No update yet")
    </section>
  </main>
</div>
```

**Key Features**:
- Side-by-side comparison of original and updated
- Visual badge showing update status
- Clickable references list
- Handles missing data gracefully
- Displays metadata (ID, source URL, created dates)

#### `api.js`

**Purpose**: Backend API client

**Functions**:

1. **`getApiBaseUrl()`**
   - Reads `VITE_API_BASE_URL` from environment
   - Validates it's set and is absolute URL
   - Returns normalized URL (trailing slash removed)
   - Throws descriptive errors if misconfigured

2. **`listArticles({type, parentId, perPage})`**
   - **Parameters**:
     - `type`: 'original' | 'updated'
     - `parentId`: Filter by parent article ID
     - `perPage`: Results per page (default: 10)
   - **Returns**: Promise<{data: Article[], ...pagination}>
   - **Endpoint**: GET /api/articles?type=...&parent_id=...&per_page=...

3. **`getArticle(id)`**
   - **Parameters**: `id` (number) - Article ID
   - **Returns**: Promise<Article>
   - **Endpoint**: GET /api/articles/{id}
   - **Includes**: Related updates

**Internal Helper**: `requestJson(path)`
- Constructs full URL from base + path
- Handles 204 No Content responses
- Throws errors with HTTP status and body

---

## Data Flow

### Complete Pipeline Flow

```
1. SEED ORIGINALS (seed-originals.js or seed-local.js)
   ├─> Scrape BeyondChats.com OR use hardcoded samples
   ├─> Extract title, content, source URL
   └─> POST /api/articles (type='original')
        └─> Stored in database

2. PIPELINE EXECUTION (run-once.js, triggered by GitHub Actions)
   ├─> GET /api/articles/latest-original-needing-update
   │    └─> Returns oldest original without updates
   │
   ├─> Search Google via SerpAPI (query = article title)
   │    └─> Get ~20 competitor article URLs
   │
   ├─> Scrape 2 competitor articles
   │    └─> Extract text content from URLs
   │
   ├─> Send to LLM API (OpenAI/Gemini)
   │    ├─> Prompt: original + 2 competitor excerpts
   │    └─> Returns: Rewritten markdown
   │
   ├─> Convert markdown to HTML
   ├─> Append citations (links to competitors)
   │
   └─> POST /api/articles (type='updated', parent_id=original.id)
        └─> Stored in database with references

3. FRONTEND DISPLAY (App.jsx)
   ├─> GET /api/articles?type=original&per_page=20
   │    └─> Load sidebar list (with updates_count)
   │
   ├─> User clicks an article
   │    └─> GET /api/articles/{id}
   │         └─> Load full article + all updates
   │
   └─> Render side-by-side:
        ├─> Left pane: Original content + source link
        └─> Right pane: Latest update + references
```

### Article Lifecycle

```
┌─────────────────┐
│  Original       │  type='original', parent_id=null
│  (BeyondChats)  │  source_url='https://beyondchats.com/...'
└────────┬────────┘
         │ (picked by pipeline)
         ▼
┌─────────────────┐
│  Google Search  │  SerpAPI query (title)
│  (Competitors)  │  Returns top 20 URLs
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Scrape 2 URLs  │  Extract article text
│                 │  Handle 403/blocked sites
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LLM Rewrite    │  OpenAI or Gemini
│                 │  Prompt: original + competitors
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Updated v1     │  type='updated', parent_id=original.id
│                 │  references=[{url, title}, ...]
└────────┬────────┘
         │ (can be run again for v2, v3...)
         ▼
┌─────────────────┐
│  Updated v2     │  type='updated', parent_id=original.id
│  (Optional)     │  created_at > v1.created_at
└─────────────────┘
```

**Note**: Multiple updates can exist for one original. Frontend displays the latest by `created_at`.

---

## Functions Reference

### Backend Functions

#### Models
- `Article::parent()` - Get parent article (for updates)
- `Article::updates()` - Get all updates (for originals)

#### Controllers
- `ArticleController::index()` - List articles with filters
- `ArticleController::store()` - Create article
- `ArticleController::show()` - Get article + updates
- `ArticleController::update()` - Update article
- `ArticleController::destroy()` - Delete article
- `ArticleController::latestOriginalNeedingUpdate()` - For pipeline
- `ArticleController::exists()` - Check by source_url

### Pipeline Functions

#### Utils
- `requireEnv(name)` - Get required env var
- `parseMaxUpdatesPerRun()` - Parse MAX_UPDATES_PER_RUN
- `parseMaxCompetitorChars()` - Parse MAX_COMPETITOR_CHARS
- `generateCitationsHtml(refs)` - Format references HTML

#### Services
- `fetchLatestOriginalNeedingUpdate()` - API: get next article
- `publishUpdatedArticle(payload)` - API: save updated
- `publishOriginalArticle(payload)` - API: save original
- `googleTopCompetitors(query, {limit})` - SerpAPI search
- `extractMainArticle(url)` - Scrape article content
- `rewriteWithLlm({...})` - LLM rewrite

#### Scripts
- `run-once.js::pickAndScrapeTwoCompetitors(query)` - Get 2 scraped competitors
- `seed-originals.js::fetchHtml(url)` - Fetch raw HTML
- `seed-originals.js::discoverLastPageUrl(base, html)` - Find last page
- `seed-originals.js::extractArticleUrls(page, html)` - Parse links
- `seed-originals.js::resetAllArticles()` - Delete all (RESET_SEED)

### Frontend Functions

#### Components
- `App::fmtDate(value)` - Format date for display
- `App::pickLatestUpdate(updates)` - Get most recent update

#### API
- `getApiBaseUrl()` - Validate and return API base URL
- `listArticles({type, parentId, perPage})` - Fetch article list
- `getArticle(id)` - Fetch single article

---

## Deployment

### Local Development

1. **Backend**:
   ```bash
   cd backend
   composer install
   cp .env.example .env
   php artisan key:generate
   touch database/database.sqlite
   php artisan migrate
   php artisan serve  # http://localhost:8000
   ```

2. **Pipeline**:
   ```bash
   cd pipeline
   npm ci
   cp .env.example .env
   # Edit .env: API_BASE_URL=http://localhost:8000
   npm run seed-local     # Seed sample data
   npm run run-mock       # Test pipeline
   ```

3. **Frontend**:
   ```bash
   cd frontend
   npm ci
   cp .env.example .env
   # Edit .env: VITE_API_BASE_URL=http://localhost:8000
   npm run dev  # http://localhost:5173
   ```

### Production Deployment

#### Database (Supabase)
- Create project at supabase.com
- Use **Connection pooling (Session Pooler)** for IPv4 compatibility
- Copy connection details for Laravel

#### Backend (Render)
- Uses `render.yaml` blueprint
- Auto-deploys on push to main
- Set environment variables in Render dashboard:
  - `APP_KEY`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
  - `FRONTEND_URL` (CORS)
- Migrations run automatically via `render-start.sh`

#### Frontend (Vercel)
- Deploy `frontend/` directory
- Set `VITE_API_BASE_URL` to Render backend URL

#### Pipeline (GitHub Actions)
- Runs every 6 hours via `.github/workflows/pipeline.yml`
- Set secrets: `API_BASE_URL`, `SERPAPI_API_KEY`, `LLM_API_KEY`, `LLM_PROVIDER`
- Can also manually trigger

---

## Key Optimizations Made

### Code Reduction
1. **Eliminated duplicate `requireEnv` function** - Saved ~40 lines
   - Was in: run-once.js, run-mock.js, seed-local.js, seed-originals.js, llm.js
   - Now in: utils/env.js (single source of truth)

2. **Consolidated citation HTML generation** - Saved ~20 lines
   - Was duplicated in: run-once.js, run-mock.js
   - Now in: utils/html.js

3. **Created shared configuration helpers** - Improved maintainability
   - `parseMaxUpdatesPerRun()` and `parseMaxCompetitorChars()`
   - Centralized validation logic

### Benefits
- **Maintainability**: Changes to env handling only need to be made once
- **Consistency**: All scripts use same validation and error messages
- **Testability**: Utility functions can be tested independently
- **Readability**: Scripts focus on business logic, not boilerplate

---

## Testing Guide

### Backend Tests
```bash
cd backend
php artisan test
```

### Pipeline Tests
```bash
cd pipeline

# Test without external APIs
npm run run-mock

# Test with real APIs (requires keys)
npm run run-once
```

### Frontend Tests
```bash
cd frontend
npm run lint     # ESLint
npm run build    # Production build
npm run preview  # Preview build
```

---

## Troubleshooting

### Common Issues

1. **Backend won't start**
   - Check: `bootstrap/cache` directory exists
   - Run: `composer install`
   - Verify: `.env` has valid `APP_KEY`

2. **Pipeline fails with 403**
   - Cause: Website blocking scraper
   - Solution: Normal - pipeline retries with other URLs

3. **LLM quota exceeded**
   - Error: "insufficient_quota"
   - Solution: Add billing or rotate API key
   - Workaround: Use `run-mock` for testing

4. **Frontend shows "No articles"**
   - Check: Backend running on correct URL
   - Check: `VITE_API_BASE_URL` in frontend/.env
   - Fix: Run `npm run seed-local` in pipeline

---

## Conclusion

This codebase implements a complete content pipeline with:
- **Backend**: Clean REST API with Laravel
- **Pipeline**: Automated workflow with external API integrations
- **Frontend**: Responsive React UI with side-by-side comparison

The architecture is modular, well-documented, and optimized for maintainability. Code duplication has been minimized through shared utilities, and the system can scale to process many articles efficiently.
