# Backend (Laravel API)

This folder contains the Laravel backend for the BeyondChats TPM assignment.

It provides:
- CRUD APIs for articles (original + updated)
- Database migrations for local SQLite and production Postgres (Supabase)
- CORS configuration for the React frontend

For the full end-to-end setup (backend + pipeline + frontend), see the repo root README:
- ../README.md

## Local development

```bash
composer install
cp .env.example .env
php artisan key:generate

mkdir -p database
touch database/database.sqlite
php artisan migrate

php artisan serve
```

## Useful endpoints

- GET /api/health
- GET /api/articles
- GET /api/articles/{id}
- POST /api/articles
- GET /api/articles/latest-original-needing-update

## Deployment

Render deployments use the Dockerfile in this folder and run startup + migrations via:
- render-start.sh
