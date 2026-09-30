# App security scanner

Phase 1 MVP. Two processes in one repo:

- `web/` — Next.js 14 (App Router) + Tailwind, Neon via `@neondatabase/serverless`
- `engine/` — Python asyncio worker claiming `scan_jobs` with `FOR UPDATE SKIP LOCKED`

## Local setup

### 1. Database

1. Create a Neon project.
2. Copy `web/env.example` to `web/.env.local`.
3. Set `DATABASE_URL` to the **pooled** connection string (host contains `-pooler`).

```bash
cd web
npm install
npm run migrate
```

### 2. Web app

```bash
cd web
npm run dev
```

Open http://localhost:3001 — health check at `/api/health`.

### 3. Worker

```bash
cd engine
python -m pip install -r requirements.txt
python worker.py
```

Click **Scan for free** on the landing page. The live scan page should move from `queued` → `running` → `done` and list passive findings (headers, files, TLS, CORS).

Uploads and cloned repos will be deleted within 24 hours (enforced in later steps). A scan is not a guarantee of security and is not a substitute for a professional pentest.
