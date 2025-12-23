# Pipeline (TypeScript scripts)

Location: `pipeline/`

## Purpose

The pipeline is a Node.js/TypeScript toolchain that:
- Seeds “original” articles from BeyondChats into the backend.
- Periodically selects an original article that has no update.
- Finds competitor content via SerpAPI.
- Scrapes competitor pages.
- Rewrites the original article via an LLM (OpenAI or Gemini).
- Publishes the updated article back to the Laravel API with references.

## Runtime model

These scripts are meant to be run:
- Locally via `npm -C pipeline run ...`
- In GitHub Actions (scheduled pipeline + manual seeding)

Key env vars:
- `API_BASE_URL` (required): backend base URL.
- `SERPAPI_API_KEY` (real pipeline only)
- `LLM_API_KEY` (real pipeline only)
- `LLM_PROVIDER`: `gemini` (default) or `openai`
- `LLM_MODEL`: provider model override
- `MAX_UPDATES_PER_RUN`: default `1`
- `MAX_COMPETITOR_CHARS`: default `12000`

## Files

### src/types/index.ts

Purpose:
- Central types shared across pipeline modules.

Key types:
- `Article`, `Reference` — match backend JSON.
- `OriginalArticlePayload`, `UpdatedArticlePayload` — payload contracts for backend create.
- `CompetitorData`, `RewriteParams`, `RewriteResult` — LLM rewrite request/response shapes.
- `ExtractionResult` — output of scraping.
- `SerpApiResponse` — minimal SerpAPI response shape.
- `OpenAIResponse`, `GeminiResponse` — minimal response shapes used by the code.

### src/utils/env.ts

Purpose:
- Env var helpers with validation.

Key functions:
- `requireEnv(name)`
  - Returns a required env var or throws with a clear message.

- `parseMaxUpdatesPerRun()`
  - Parses `MAX_UPDATES_PER_RUN` and clamps to a positive integer (default 1).

- `parseMaxCompetitorChars()`
  - Parses `MAX_COMPETITOR_CHARS` and enforces a minimum threshold (default 12000).

### src/utils/html.ts

Purpose:
- Generates a stable references/citations HTML block appended to updated content.

Key functions:
- `generateCitationsHtml(references)`
  - Returns `''` for empty references.
  - Escapes HTML content to avoid accidental injection.
  - Filters out invalid/non-http(s) URLs.
  - Emits a simple `<h2>References</h2>` list.

### src/services/laravelApi.ts

Purpose:
- HTTP client for the Laravel backend.

Key functions:
- `apiBaseUrl()`
  - Reads `process.env.API_BASE_URL` and normalizes trailing slash.

- `fetchWithRetry(url, options, retryOptions)`
  - Wraps `fetch` with:
    - timeout via `AbortController`
    - exponential backoff for timeouts

- `requestJson<T>(path, options)`
  - Performs JSON requests and throws on non-2xx.
  - Treats HTTP 204 as unexpected for endpoints that should return JSON.

- `requestJsonOrNull<T>(path, options)`
  - Same as above but returns `null` on HTTP 204.

Exported API:
- `fetchLatestOriginalNeedingUpdate()`
  - Calls `/api/articles/latest-original-needing-update`.
  - Returns `Article | null` depending on whether an original exists.

- `publishOriginalArticle(payload)`
  - POST `/api/articles` for `type=original`.

- `publishUpdatedArticle(payload)`
  - POST `/api/articles` for `type=updated`.

### src/services/serpapi.ts

Purpose:
- Queries Google results via SerpAPI and filters to “likely article” URLs.

Key functions:
- `googleTopCompetitors(query, { limit })`
  - Calls SerpAPI with `engine=google` and returns a filtered list.
  - Uses `isDisallowedDomain` to avoid social sites and BeyondChats itself.
  - Uses `looksLikeArticle` heuristics to avoid non-article pages.

### src/services/scrape.ts

Purpose:
- Scrapes and extracts main article content.

Key functions:
- `headers()`
  - Produces browser-like request headers.

- `htmlToPlainText(html)`
  - Converts HTML → text (ignores href text in anchors).

- `parseTitleFromHtml(html)`
  - Lightweight `<title>` tag extraction.

- `extractMainArticle(url)`
  - First tries `@extractus/article-extractor`.
  - Falls back to raw fetch + HTML-to-text if extractor yields empty content.
  - Returns `{ title, text, html }`.

### src/services/llm.ts

Purpose:
- Produces rewritten content via either OpenAI or Gemini.

Key functions:
- `getProvider()`
  - Reads `LLM_PROVIDER` and normalizes to `openai | gemini`.

- `rewriteWithOpenAi(params)`
  - Calls OpenAI Chat Completions.
  - Adds helpful error messages for quota/rate-limit issues.

- `rewriteWithGemini(params)`
  - Calls Google `generateContent` API.
  - Normalizes model name.
  - Adds helpful error messages for 429 and model-not-found.

- `rewriteWithLlm({ originalHtml, competitorA, competitorB })`
  - Builds a strict “no plagiarism” prompt.
  - Converts HTML → text for cleaner prompt.
  - Converts markdown output back to HTML using `marked`.

### src/run-once.ts

Purpose:
- Executes one “real” pipeline run.

Key functions:
- `pickAndScrapeTwoCompetitors(query)`
  - Pulls candidates via SerpAPI.
  - Scrapes until it has 2 good competitor pages.

- `main()`
  - Loads env requirements.
  - Loops up to `MAX_UPDATES_PER_RUN` times.
  - Fetches an original needing update.
  - Rewrites and publishes an updated article.

### src/run-mock.ts

Purpose:
- Executes a pipeline run without external APIs.
- Useful for demos when no SerpAPI/LLM keys are available.

Key functions:
- `mockRewrite(originalTitle, originalHtml)`
  - Produces a deterministic “updated” version.

- `main()`
  - Fetches an original needing update and publishes an updated article using mock data.

### src/seed-originals.ts

Purpose:
- Seeds original articles from BeyondChats.

Key functions:
- `parseCountFromArgs()`
  - Reads `--count` or `SEED_COUNT` (default 5).

- `parseResetFromEnv()`
  - Reads `RESET_SEED` to decide whether to clear existing content.

- `fetchHtml(url)`
  - Fetch helper with a clear user-agent.

- `discoverLastPageUrl(baseUrl, listingHtml)`
  - Finds the highest page number in listing links.

- `extractArticleUrls(pageUrl, html)`
  - Collects unique blog post URLs from the listing HTML.

- `resetAllArticles()`
  - Deletes updated then original articles by paging through the API.

- `main()`
  - Orchestrates reset + seeding + publishing originals.

### src/seed-local.ts

Purpose:
- Seeds a few hardcoded articles locally (useful for backend dev without scraping).

Key functions:
- `main()`
  - Publishes the static list into the backend.
