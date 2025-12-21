# Render deployment checklist (planned)

## Backend (Laravel web service)
- Service type: Web Service
- Runtime: Docker
- Root Directory: `backend`
- Dockerfile: `backend/Dockerfile`
- Env vars: APP_KEY, APP_URL, DB_* (Supabase), etc.

## Pipeline (Node cron)
- Service type: Cron Job
- Runtime: Docker
- Root Directory: `pipeline`
- Dockerfile: `pipeline/Dockerfile`
- Schedule: every 6 hours (adjustable)
- Env vars: API_BASE_URL, SERPAPI_API_KEY, LLM_API_KEY, etc.
