# PT-3 Demo — Fullstack Showcase

This repository is a compact fullstack demo (FastAPI backend + vanilla JS frontend) intended as a recruiter-facing project. It includes authentication, file uploads, comments, admin & audit logging, and interactive charts.

Highlights
- JWT authentication with refresh support
- File uploads saved to `/uploads`
- Admin panel with audit logs (server-side paging & filters)
- Interactive Chart.js visualization with drilldown
- Responsive, modern UI with animations and toasts
- Playwright e2e tests and GitHub Actions CI integration

Quick start (local)

1. Create and activate virtualenv, install Python deps, seed demo data:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m backend.seed
```

2. Run the server:

```powershell
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

3. Open `http://127.0.0.1:8000`

Seeded accounts:
- `demo` / `demopass`
- `admin` / `adminpass`

Docker Compose (one-command deploy)

```powershell
docker compose up --build -d
```

E2E tests (Playwright)

```powershell
# install node deps
npm ci
npx playwright install --with-deps
# run e2e
npm run test:e2e
```

Demo GIF

See `assets/demo.gif` for a short demo clip (placeholder). Replace with your own recorded clip if desired.

License: MIT-style for demo purposes.
# PT-3 Fullstack Demo

This is a small fullstack web app (frontend + backend + database) implemented under `e:/pt-3`.

**Tech stack**
- Frontend: HTML/CSS/JavaScript (served by backend)
- Backend: Python + FastAPI
- Database: SQLite by default (optionally configurable via `DATABASE_URL` for MySQL/Postgres)
- Auth: JWT tokens with bcrypt-hashed passwords
- Visualization: Chart.js (via CDN in frontend)

## What I built
- User registration and login (JWT-based)
- Simple `Item` resource CRUD for authenticated users
- Dashboard UI that shows items and a small Chart.js visualization
- Configurable DB URL; default is `sqlite:///./pt3.db`

## Setup (Windows PowerShell)
1. Create and activate a virtual environment
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```
2. Install dependencies
```powershell
pip install --upgrade pip
pip install -r requirements.txt
```
3. Run the app
```powershell
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```
4. Open the UI
- Visit `http://127.0.0.1:8000` in your browser.

## Extras added to impress a recruiter
- Edit and delete items from the UI.
- `/api/me` profile endpoint.
- Pagination and search on `GET /api/items` via `q`, `limit`, and `offset` query params.
- Refresh tokens: login returns a `refresh_token`; `POST /api/refresh` returns a new access token.
- Seed script: run `python -m backend.seed` to create a demo user `demo/demopass` and sample items.
- Dockerfile for containerized demo.
- Basic unit tests in `tests/` and a GitHub Actions workflow to run them.
 - Role-based permissions: users have a `role` (default `user`). An `admin` account is seeded (`admin/adminpass`) and can access `/api/admin/users`.
 - File uploads: upload a file to an item (`/api/items/{id}/upload-multipart`) and view it from the UI.
 - Comments: add and list comments per item (`/api/items/{id}/comments`).
 - Responsive frontend and small UX improvements (confirmations, file preview link, comment panel).

## Docker (optional)
Build and run with Docker:
```powershell
docker build -t pt3-demo:latest .
docker run -p 8000:8000 pt3-demo:latest
```

## Run seed data
From project root:
```powershell
python -m backend.seed
```

## Running tests locally
```powershell
pip install -r requirements.txt
pytest -q
```

## Environment
- The app uses `DATABASE_URL` environment variable if provided (e.g. `postgresql://user:pass@host/db`).
- By default it uses `sqlite:///./pt3.db` in project root.

## Environment variables
You can provide runtime configuration via environment variables or a `.env` file (the backend loads `.env` if present).
Copy `.env.example` to `.env` and update values for your environment.

Key environment variables:
- `SECRET_KEY`: secret used to sign JWT tokens (REQUIRED in production).
- `DATABASE_URL`: SQLAlchemy database URL. Examples:
	- SQLite (default): `sqlite:///./pt3.db`
	- Postgres: `postgresql://user:password@localhost:5432/pt3db`
	- MySQL: `mysql+pymysql://user:password@localhost:3306/pt3db`
- `ACCESS_TOKEN_EXPIRE_MINUTES`: access token lifetime in minutes (default 1440).
- `REFRESH_TOKEN_EXPIRE_DAYS`: refresh token lifetime in days (default 7).

CI notes:
- Playwright tests were observed to be flakier when run in parallel workers. To increase stability in CI, run Playwright with `--workers=1` (or enable retries). You can set an env var like `PLAYWRIGHT_WORKERS=1` in your CI job and use it when invoking `npx playwright test`.

## Assumptions & Bonus
- Minimal single-file DB migration (no Alembic) – schema is created at startup.
- Authentication uses JWT returned to the frontend; localStorage is used for token storage in the demo.
- Frontend is intentionally small and focuses on usability. Chart shows counts of items per category.
- You can switch DB engines by setting `DATABASE_URL` before starting the app.

## Next steps you might ask me to do
- Add persistent sessions via refresh tokens
- Add file uploads and richer UI
- Add tests and CI

If you want, I can also commit these files and run a quick smoke-test server locally.
