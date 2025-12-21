# BeyondChats TPM Assignment (Monorepo)

## Stack (recommended)
- DB: Supabase Postgres
- Backend API: Laravel (Render Web Service)
- Pipeline: Node.js (GitHub Actions scheduled workflow)
- Frontend: React (Vite) (Vercel)
- SERP: SerpAPI
- LLM: Provider via API key (OpenAI/Anthropic/etc.)

## Repo structure
- `backend/`  - Laravel API (CRUD + scraper command)
- `pipeline/` - Node pipeline (SERP + scrape + LLM + publish)
- `frontend/` - React UI
- `docs/`     - diagrams and notes

## Diagrams
- Architecture: `docs/architecture.md`
- Data flow: `docs/data-flow.md`
- ERD: `docs/erd.md`

## Local setup (high-level)
### 1) Database (Supabase)
- Create a Supabase project.
- Get connection details (host/port/db/user/password).
- Ensure network access allows your app to connect (Supabase “network restrictions” if enabled).

### 2) Backend (Laravel)
- Copy env: `cp backend/.env.example backend/.env`
- Set DB values in `backend/.env`:
	- `DB_HOST=db.rlkuzrmuepqavhcfkcrh.supabase.co`
	- `DB_PORT=5432`
	- `DB_DATABASE=postgres`
	- `DB_USERNAME=postgres`
	- `DB_PASSWORD=...` (do not commit)
	- `DB_SSLMODE=require`
- Run migrations (requires correct DB password): `cd backend && php artisan migrate`
- Scrape oldest 5: `cd backend && php artisan articles:scrape-oldest --count=5`
- Run locally: `cd backend && php artisan serve`

### 3) Pipeline (Node)
- Copy env: `cp pipeline/.env.example pipeline/.env`
- Set:
	- `API_BASE_URL=http://localhost:8000` (or your Render backend URL)
	- `SERPAPI_API_KEY=...`
	- `LLM_API_KEY=...`
	- `LLM_MODEL=gpt-4o-mini` (optional)
- Install + run: `cd pipeline && npm install && npm run run-once`

### 4) Frontend (React)
- Copy env: `cp frontend/.env.example frontend/.env`
- Set: `VITE_API_BASE_URL=http://localhost:8000`
- Install + run: `cd frontend && npm install && npm run dev`

## Deploy
### Backend (Render)
- Use the Render Blueprint in `render.yaml` to deploy only the backend (free plan).
- Set backend env vars in Render (at minimum):
	- `APP_ENV=production`
	- `APP_DEBUG=false`
	- `APP_KEY` (Laravel app key)
	- `APP_URL` (Render URL)
	- `DB_CONNECTION=pgsql` + Supabase `DB_*` vars + `DB_SSLMODE=require`
	- `FRONTEND_URL=https://<your-vercel-app>.vercel.app`

### Pipeline (GitHub Actions)
- The scheduled workflow is in `.github/workflows/pipeline.yml`.
- In GitHub repo settings, add Actions secrets:
	- `API_BASE_URL` = your Render backend base URL (must serve `/api/articles/...`)
	- `SERPAPI_API_KEY`
	- `LLM_API_KEY`
	- `LLM_MODEL` (optional)
	- `MAX_COMPETITOR_CHARS` (optional)
- You can trigger it manually from GitHub Actions (Workflow dispatch).

### Frontend (Vercel)
- Deploy `frontend/`.
- Set `VITE_API_BASE_URL` to your Render backend URL.
