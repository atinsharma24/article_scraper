# Codebase Walkthrough (Directory-wise)

This folder documents the project-owned code (the parts you are expected to read/edit).

## What is included

- `backend/app/**` and `backend/routes/**` (Laravel API)
- `frontend/src/**` (React + Vite UI)
- `pipeline/src/**` (TypeScript pipeline + seeding scripts)
- Repo-level deployment/runtime configuration (`render.yaml`, Dockerfiles, GitHub Actions workflows)

## What is intentionally excluded

- `backend/vendor/**` (Composer dependencies)
- `frontend/node_modules/**`, `pipeline/node_modules/**` (npm dependencies)
- Build outputs like `frontend/dist/**`

## Index

- [Backend (Laravel API)](./backend.md)
- [Frontend (React + Vite)](./frontend.md)
- [Pipeline (TypeScript scripts)](./pipeline.md)
- [Deploy & Configuration](./deploy-and-config.md)
- Database: see [Supabase schema notes](../supabase-schema.md)
