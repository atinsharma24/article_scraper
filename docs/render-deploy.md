# Render deployment checklist

## Backend (Laravel web service)
- Service type: Web Service
- Runtime: Docker
- Root Directory: `backend`
- Dockerfile: `backend/Dockerfile`
- Env vars: APP_KEY, APP_URL, DB_* (Supabase), etc.

## Pipeline (GitHub Actions)
- Render cron jobs require paid plans, so the pipeline is scheduled via GitHub Actions.
- Workflow: `.github/workflows/pipeline.yml`
- Required GitHub Actions secrets:
	- `API_BASE_URL`
	- `SERPAPI_API_KEY`
	- `LLM_API_KEY`
	- `LLM_MODEL` (optional)
	- `MAX_COMPETITOR_CHARS` (optional)
