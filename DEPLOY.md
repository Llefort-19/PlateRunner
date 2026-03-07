# HTE App — Beta Web Deployment Guide

## Overview

The app deploys as a single Docker container on [Render](https://render.com).
Flask serves both the API and the pre-built React frontend from the same origin,
so there is no CORS complexity and no separate frontend hosting needed.

---

## Quick Start (Render)

### 1. Push to GitHub

Make sure your repo is on GitHub (or GitLab). The data files (`Inventory.xlsx`,
`Solvent.xlsx`) should be committed to `data/` — or you can upload them manually
to the persistent disk after the first deploy (see step 4).

### 2. Create a new Web Service on Render

1. Go to [render.com](https://render.com) → **New → Blueprint**
2. Connect your GitHub repo
3. Render will auto-detect `render.yaml` and pre-fill the settings
4. Click **Apply** — Render will build the Docker image and deploy

The first build takes ~10–15 min (conda + RDKit installation).
Subsequent deploys are faster due to layer caching.

### 3. Set your domain in render.yaml

After the first deploy, Render assigns a URL like `https://hte-app.onrender.com`.
Update `CORS_ORIGINS` in `render.yaml` (or the Render dashboard) to match:

```
CORS_ORIGINS=https://hte-app.onrender.com
```

### 4. Upload data files to the persistent disk (if not committed to git)

If `Inventory.xlsx` / `Solvent.xlsx` are not in your repo, upload them via
Render's **Shell** tab (available on paid plans) or via the seed script:

```bash
# In Render shell:
ls /data/        # check what's there
# Upload files using Render's file upload or rclone
```

### 5. Generate invite codes for beta testers

```bash
# In Render shell or locally against the deployed DB:
cd backend
python seed.py generate 10
```

Share the printed codes with your beta testers. Each code can only be used once.

---

## Local Docker Testing

```bash
# Build and run
SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))") \
docker-compose up --build

# App will be at http://localhost:5000
# Generate invite codes:
docker-compose exec hte-app python backend/seed.py generate 5
```

---

## Managing Beta Users

### Generate invite codes
```bash
# Local:
cd backend && python seed.py generate 10

# On Render (Shell tab):
cd /app/backend && python seed.py generate 10
```

### List unused codes
```bash
python seed.py list
```

### Check registered users (SQLite)
```bash
sqlite3 /data/hte_beta.db "SELECT id, username, created_at FROM users;"
```

### Disable a user
```bash
sqlite3 /data/hte_beta.db "UPDATE users SET is_active=0 WHERE username='spammer';"
```

---

## Architecture Notes

| Component | Detail |
|-----------|--------|
| Python | 3.11 via conda (required for RDKit) |
| Web server | Gunicorn, 1 worker + 4 threads |
| Database | SQLite on persistent disk (`/data/hte_beta.db`) |
| Auth | Flask-Login sessions, bcrypt passwords, invite codes |
| State | Per-user experiment stored as JSON in `experiments` table |
| Reference data | Inventory.xlsx + Solvent.xlsx on persistent disk |
| HTTPS | Automatic via Render (Let's Encrypt) |

**Single worker** is intentional — SQLite doesn't support concurrent writes
across processes. Upgrade to PostgreSQL + multiple workers if beta grows beyond
~20 concurrent users.

---

## Upgrading to PostgreSQL (future)

1. Change `DATABASE_URL` in Render env vars to a PostgreSQL connection string
2. The SQLAlchemy models are already compatible — no code changes needed
3. You can increase `--workers` in `backend/start.sh`
