# BeyondChats TPM Assignment (Monorepo)

A full-stack content pipeline application that scrapes original articles, rewrites them using AI, and displays both versions side-by-side.

![Application Screenshot](https://github.com/user-attachments/assets/3d458a3e-69b0-4eb0-9734-aa35b0987fee)

## Stack
- **Database**: Supabase Postgres (production) / SQLite (local development)
- **Backend API**: Laravel 12 (PHP 8.3+)
- **Pipeline**: Node.js scripts (SERP + scrape + LLM + publish)
- **Frontend**: React 19 + Vite
- **Deployment**: Render (backend), Vercel (frontend), GitHub Actions (pipeline)
- **External APIs**: SerpAPI (search), OpenAI (LLM rewriting)

## Repository Structure
```
.
├── backend/          Laravel API (CRUD + database)
├── pipeline/         Node.js scripts (seeding, pipeline)
├── frontend/         React UI (Vite)
├── docs/            Architecture diagrams and notes
└── .github/         GitHub Actions workflows
```

## Documentation
- **Architecture**: [`docs/architecture.md`](docs/architecture.md)
- **Data Flow**: [`docs/data-flow.md`](docs/data-flow.md)
- **Entity Relationship**: [`docs/erd.md`](docs/erd.md)
- **Deployment**: [`docs/render-deploy.md`](docs/render-deploy.md)

---

## Quick Start (Local Development)

### Prerequisites
- PHP 8.3+ with extensions: `pdo`, `pdo_sqlite`, `intl`, `mbstring`
- Composer 2+
- Node.js 20+
- npm

### 1. Backend Setup

```bash
cd backend

# Install dependencies
composer install

# Create environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Create SQLite database for local development
mkdir -p database
touch database/database.sqlite

# Run migrations
php artisan migrate

# Start development server
php artisan serve
# Server runs at http://localhost:8000
```

### 2. Pipeline Setup

```bash
cd pipeline

# Install dependencies
npm ci

# Create environment file
cp .env.example .env
# Edit .env and set API_BASE_URL=http://localhost:8000

# Seed sample articles (works offline)
npm run seed-local

# Run mock pipeline (works without external APIs)
npm run run-mock
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm ci

# Create environment file
cp .env.example .env
# Edit .env and set VITE_API_BASE_URL=http://localhost:8000

# Start development server
npm run dev
# Frontend runs at http://localhost:5173
```

### 4. Verify Everything Works

1. Open http://localhost:5173 in your browser
2. You should see 3 original articles in the sidebar
3. Click on any article to see the original and updated versions side-by-side
4. The updated version includes references at the bottom

---

## Pipeline Scripts

### Local Testing (No External APIs Required)

The repository includes mock scripts for testing without external API access:

- **`npm run seed-local`**: Seeds sample articles into the database
- **`npm run run-mock`**: Runs a mock pipeline that creates updated versions

### Production Scripts (Requires External APIs)

These scripts require SERPAPI_API_KEY and LLM_API_KEY in your `.env` file:

- **`npm run seed-originals`**: Scrapes BeyondChats.com and seeds real articles
- **`npm run run-once`**: Runs the full pipeline (SERP + scrape + LLM + publish)

---

## Production Deployment

### Database (Supabase)

1. Create a Supabase project at https://supabase.com
2. In Supabase Dashboard → **Connect**, use **Connection pooling (Session Pooler)** if deploying to an IPv4-only platform (e.g., Render Free)
3. Copy the pooler connection details (host, port, database, username, password) exactly as shown

### Backend (Render)

1. **Deploy using Render Blueprint**:
   - The `render.yaml` file configures automatic deployment
   - Connect your GitHub repo to Render
   - Render will automatically deploy on push to main

2. **Set Environment Variables in Render Dashboard**:
   ```
   APP_ENV=production
   APP_DEBUG=false
   APP_KEY=base64:... (generate with: php artisan key:generate --show)
   APP_URL=https://your-app.onrender.com
   
   DB_CONNECTION=pgsql
   # IMPORTANT: Don't use Supabase "Direct connection" (db.<project-ref>.supabase.co:5432)
   # on IPv4-only hosts. Use Supabase "Connection pooling" (Session Pooler) instead.
   DB_HOST=<pooler-host-from-supabase>
   DB_PORT=<pooler-port-from-supabase>
   DB_DATABASE=postgres
   DB_USERNAME=<pooler-username-from-supabase>
   DB_PASSWORD=your_supabase_password
   DB_SSLMODE=require
   
   FRONTEND_URL=https://your-vercel-app.vercel.app
   ```

3. **Migrations run automatically** on each deployment (see `render-start.sh`)

### Frontend (Vercel)

1. Deploy the `frontend/` directory to Vercel
2. Set environment variable:
   ```
   VITE_API_BASE_URL=https://your-app.onrender.com
   ```

### Pipeline (GitHub Actions)

The pipeline runs automatically every 6 hours, or you can trigger it manually.

1. **Set GitHub Actions Secrets**:
   - Go to: Repository Settings → Secrets and variables → Actions
   - Add the following secrets:
     ```
     API_BASE_URL=https://your-app.onrender.com
     SERPAPI_API_KEY=your_serpapi_key
     LLM_API_KEY=your_openai_key
     LLM_MODEL=gpt-4o-mini (optional)
     MAX_COMPETITOR_CHARS=20000 (optional)
     ```

2. **Workflows**:
   - **Content Pipeline** (`.github/workflows/pipeline.yml`): Runs every 6 hours
   - **Seed Originals** (`.github/workflows/seed-originals.yml`): Manual trigger to seed articles

3. **Manual Trigger**:
   - Go to Actions tab → Select workflow → Run workflow

---

## API Endpoints

### Articles API

- `GET /api/health` - Health check (does not touch the database)
- `GET /api/articles` - List all articles
  - Query params: `type` (original|updated), `parent_id`, `per_page` (max 100)
- `GET /api/articles/{id}` - Get single article with updates
- `POST /api/articles` - Create new article
- `PUT /api/articles/{id}` - Update article
- `DELETE /api/articles/{id}` - Delete article
- `GET /api/articles/latest-original-needing-update` - Get oldest original without updates

---

## Troubleshooting

### Backend won't start
- Ensure `bootstrap/cache` directory exists and is writable
- Run `composer install` to install dependencies
- Check `.env` file has correct database settings

### Pipeline fails with "fetch failed"
- This is expected if running in restricted environments
- Use `npm run seed-local` and `npm run run-mock` for testing
- For production, ensure network access to external APIs

### Frontend shows "No articles"
- Ensure backend is running
- Check `VITE_API_BASE_URL` in frontend `.env`
- Run `npm run seed-local` in pipeline to add sample data

### Render deployment fails
- Check that `bootstrap/cache` directory exists in repo
- Verify environment variables are set correctly
- Check Render logs for specific error messages

---

## License

This project is for the BeyondChats TPM assignment.
