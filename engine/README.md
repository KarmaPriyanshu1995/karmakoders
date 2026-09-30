# Scan engine

Python worker that claims rows from `scan_jobs` with `SELECT … FOR UPDATE SKIP LOCKED`.

## Current stages

Passive URL checks (read-only):

- Security headers, exposed files, TLS, open CORS
- Playwright JS bundle capture (child process) + gitleaks/trufflehog secret scan
- Evidence stores redacted secrets only (first 6 + last 4 + SHA-256)

On Windows the worker uses a SelectorEventLoop for Neon/`psycopg`, so Playwright and CLI tools are launched via `subprocess.run` in a thread (not `asyncio.create_subprocess_exec`).

## Setup

```bash
cd engine
python -m pip install -r requirements.txt
python scripts/fetch_tools.py
python -m playwright install chromium
```

The worker reads `DATABASE_URL` from `../web/.env.local` automatically. Prefer a direct Neon URL as `DATABASE_URL_DIRECT` in `engine/.env` when you can.

## Run

```bash
cd engine
python worker.py
```

Captured bundles are deleted when the stage finishes. Never store raw secrets — only redacted forms and SHA-256 hashes.
