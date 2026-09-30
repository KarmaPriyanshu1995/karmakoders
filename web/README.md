# Scanner web app

Next.js 14 app for the security scanner. Pair with the Python worker in `/engine`.

## Run locally

```bash
cd web
npm install
cp env.example .env.local
```

Set `DATABASE_URL` to the Neon **pooled** connection string (host contains `-pooler`).

```bash
npm run migrate
npm run dev
```

Open http://localhost:3001. In another terminal:

```bash
cd engine
python -m pip install -r requirements.txt
python worker.py
```

Paste a URL and click **Scan for free**. The live page should show hello stage events and finish as `done`.

Health: http://localhost:3001/api/health
