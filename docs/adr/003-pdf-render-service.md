# ADR 003 — Separate PDF render service

Date: 2026-09-29  
Status: Accepted

## Context

HTML templates must become print-faithful PDFs. Puppeteer/Chromium does not fit Next.js on Vercel (bundle size, OS dependencies, function timeout). This repo has no Dockerfile today.

## Decision

Run a **small Docker service** (Puppeteer) on **Railway or Render**. The Next.js app (via Inngest) POSTs HTML with an **HMAC** using `PDF_SERVICE_SECRET`. **pdf-lib** stays in the Next.js/Inngest worker for stamping signatures and appending the audit certificate.

## Consequences

Positive: marketing site deploys stay fast; Chromium version is pinned in Docker; Sign can swap the renderer without a Vercel rebuild.

Negative: a second production service and secret; HMAC clock skew; render latency on the completion path.

Rejected alternative: `@sparticuz/chromium` on a Vercel hog function — brittle and still timeout-prone for long agreements.
