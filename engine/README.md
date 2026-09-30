# Scan engine

Python worker that claims rows from `scan_jobs` with `SELECT … FOR UPDATE SKIP LOCKED`.

## Current stages (step 3)

Passive URL checks (read-only):

- Security headers (CSP, HSTS, X-Frame-Options, …)
- Exposed sensitive files (`.env`, `.git`, backups, source maps)
- TLS / certificate basics
- Open CORS (`Access-Control-Allow-Origin: *`)

## Setup

```bash
cd engine
python -m pip install -r requirements.txt
```

The worker reads `DATABASE_URL` from `../web/.env.local` automatically. Prefer a direct Neon URL as `DATABASE_URL_DIRECT` in `engine/.env` when you can.

## Run

```bash
cd engine
python worker.py
```
