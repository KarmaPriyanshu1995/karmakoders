# Scan engine

Python 3.12+ worker that claims rows from `scan_jobs` with `SELECT … FOR UPDATE SKIP LOCKED`, runs stages, and writes `scan_events`.

Step 2 only runs a fake **hello** stage so we can prove the queue end to end.

## Setup

```bash
cd engine
python -m pip install -r requirements.txt
```

The worker reads `DATABASE_URL` from `../web/.env.local` automatically. For production, prefer a **direct** (non-pooler) Neon URL in `engine/.env` as `DATABASE_URL_DIRECT`.

## Run

```bash
cd engine
python worker.py
```

Leave it running. From the web app, click **Scan for free**; the worker should pick up the job within about a second and write hello events.
