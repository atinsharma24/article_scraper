# Deploy & Configuration

This document covers repo-level runtime and deployment configuration.

## GitHub Actions

Workflows live in `.github/workflows/`.

### pipeline.yml

Purpose:
- Runs the "Content Pipeline" on a schedule and via manual dispatch.

Key steps:
- Checkout
- Setup Node + cache
- `npm ci` in `pipeline/`
- Resolve `API_BASE_URL`
  - Prefers `secrets.API_BASE_URL`.
  - Allows overriding via workflow input `api_base_url`.
  - Ignores the placeholder `https://your-app.onrender.com`.
- Validates `LLM_API_KEY` for real mode.
- Runs either:
  - `npm -C pipeline run run-once` (real)
  - `npm -C pipeline run run-mock` (mock)

Required secrets for `mode=real`:
- `API_BASE_URL`
- `SERPAPI_API_KEY`
- `LLM_API_KEY`

### seed-originals.yml

Purpose:
- Manually seeds original articles from BeyondChats.

Key steps:
- Checkout
- Setup Node + cache
- `npm ci` in `pipeline/`
- Resolve `API_BASE_URL` (same behavior as pipeline)
- Health check: `GET $API_BASE_URL/api/health`
- Run `npm -C pipeline run seed-originals`

Required secrets:
- `API_BASE_URL`

## Render deployment

Key files:
- `render.yaml`
- `backend/Dockerfile`
- `backend/render-start.sh`

Typical Render behavior:
- Build: installs PHP deps and builds frontend assets as needed.
- Start: runs Laravel using the provided start script.

Environment variables (Render service):
- `APP_KEY`, `APP_ENV`, `APP_URL`
- `DATABASE_URL` (Supabase Postgres)
- `FRONTEND_URL` (allowed origins for CORS)

## Vercel deployment

Frontend lives in `frontend/` and should be deployed as a Vite SPA.

Environment variables (Vercel):
- `VITE_API_BASE_URL` — must point to the Render backend base URL.

## Pipeline runtime

The pipeline is not intended to run as a long-lived server.
It runs on-demand in CI or locally.

Local run examples:
- `API_BASE_URL=http://localhost:8000 npm -C pipeline run seed-originals`
- `API_BASE_URL=http://localhost:8000 SERPAPI_API_KEY=... LLM_API_KEY=... npm -C pipeline run run-once`

## Supabase

Supabase stores the Laravel tables.
- Migrations are in `backend/database/migrations/`.

See the schema explanation doc:
- `docs/supabase-schema.md`
