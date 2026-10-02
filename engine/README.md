# Scan engine

Python worker that claims rows from `scan_jobs` with `SELECT … FOR UPDATE SKIP LOCKED`.

## Current stages

Passive URL checks (read-only):

- Security headers, exposed files, TLS, open CORS
- Playwright JS bundle capture (child process) + gitleaks/trufflehog secret scan
- Evidence stores redacted secrets only (first 6 + last 4 + SHA-256)

### Phase B — finding intelligence

Every finding passes through `lib/normalize.py` before persistence:

| Field | Meaning |
|-------|---------|
| `category` | Broad domain (`secrets`, `headers`, `tls`, `cors`, `exposure`, …) |
| `finding_type` | Specific detector id (e.g. `secret_in_bundle`, `missing_security_header`) |
| `confidence` | Deterministic float in `[0, 1]` — **not** severity |
| `confidence_reason` | Auditable explanation of the score |
| `verification_status` | `verified` / `unverified` / `not_applicable` / `candidate` |
| `scanner_source` | e.g. `gitleaks`, `headers`, `engine` |

Confidence examples:

- Gitleaks match in shipped JS → `0.85` / `unverified`
- TruffleHog **Verified** match → `0.95` / `verified`
- Missing security header (observed HTTP) → `0.95` / `not_applicable`

Historical findings (pre-migration) may have `NULL` Phase B columns; the API/UI tolerate that.

### Phase C — security grade & live progress

After findings are saved, `lib/grade.py` computes a deterministic letter grade (`A`–`F`, algorithm `v1`) from severity × verification × confidence, with safety floors for high-confidence secrets/criticals. Incomplete/failed scans do **not** get a final grade.

Persisted on `scans`: `grade`, `grade_algorithm_version`, `grade_breakdown`, `grade_calculated_at`.

Live UI uses SSE at `GET /api/scans/[id]/events` (progress derived from real `scan_events`, not invented percentages). Founder / Developer modes share the same finding API data.

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
