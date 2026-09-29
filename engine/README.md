# Engine

The Python scan worker is step 2. It will claim rows from `scan_jobs` with `SELECT ... FOR UPDATE SKIP LOCKED` and is not built yet.
