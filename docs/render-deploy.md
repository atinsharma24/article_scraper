# Render deployment checklist

## Backend (Laravel web service)

- Service type: Web Service
- Runtime: Docker
- Root Directory: `backend`
- Dockerfile: `backend/Dockerfile`
- Env vars: APP_KEY, APP_URL, DB_* (Supabase), etc.

### Supabase database note (important)

- If Supabase shows **"Not IPv4 compatible"** for the direct DB host (`db.<project-ref>.supabase.co:5432`), Render Free will not be able to connect.
- Use Supabase Dashboard → **Connect** → **Connection pooling** → **Session Pooler**.
- Copy `host`, `port`, `database`, and `user` exactly from Supabase and set them as Render env vars.
- Set `DB_SSLMODE=require`.

### Smoke tests

- App is up (no DB needed): `GET /api/health`
- DB + migrations are working: `GET /api/articles`

## Pipeline (GitHub Actions)

- Render cron jobs require paid plans, so the pipeline is scheduled via GitHub Actions.
- Workflow: `.github/workflows/pipeline.yml`
- Required GitHub Actions secrets:

  - `API_BASE_URL`
  - `SERPAPI_API_KEY`
  - `LLM_API_KEY`
  - `LLM_MODEL` (optional)
  - `MAX_COMPETITOR_CHARS` (optional)
