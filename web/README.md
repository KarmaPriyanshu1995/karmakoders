# Scanner web app

Next.js 14 app for the security scanner. The Python worker will live in `/engine` (step 2). This folder is separate from the existing app at the repo root.

## Run locally

```bash
cd web
npm install
cp env.example .env.local
```

Edit `.env.local` and set `DATABASE_URL` to the **pooled** Neon connection string (the host contains `-pooler`).

```bash
npm run migrate
npm run dev
```

Open http://localhost:3001. The database check is at http://localhost:3001/api/health.

`npm test` checks that the migration SQL still defines the phase 1 tables. It does not connect to Neon.
