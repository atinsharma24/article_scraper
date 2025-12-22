# Architecture

This system is a 3-service application (frontend + API + pipeline) with Supabase as the database.

## High-level components

- **Frontend (Vercel)**: React + Vite UI.
- **Backend (Render)**: Laravel REST API (`/api/*`) + CORS.
- **Database (Supabase)**: Postgres (`articles` table stores originals + updated versions).
- **Pipeline (GitHub Actions)**:
	- **Seed Originals**: scrapes BeyondChats and publishes originals via the backend API.
	- **Content Pipeline**: selects an original needing an update, gathers competitor references, calls an LLM to rewrite, then publishes an updated article via the backend API.

## Diagram

![Content Pipeline Workflow](../diagrams/Content%20Pipeline%20Workflow-2025-12-22-152324.svg)

PNG fallback:

- [../diagrams/Content Pipeline Workflow-2025-12-22-152315.png](../diagrams/Content%20Pipeline%20Workflow-2025-12-22-152315.png)
