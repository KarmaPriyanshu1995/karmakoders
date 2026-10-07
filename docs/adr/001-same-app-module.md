# ADR 001 — Same-app module vs separate app

Date: 2026-09-29  
Status: Accepted

## Context

KarmaKoders Sign could be a new Next.js app (separate Vercel project) or a module inside karmakoders.com. This repo already ships the marketing site, CMS, and `/free-tools` on Vercel.

## Decision

Ship Sign **in this repository** as a bounded module (`src/modules/sign` + `src/platform`) with routes under `/tools/sign`.

## Consequences

Positive: one domain and cookie policy; shared design tokens; All Access credits live next to the brand; one deploy for marketing + product.

Negative: Next.js 16 + CMS + Sign share a serverless budget; a Sign incident can share deploy risk with the homepage; two auth systems (NextAuth vs OTP) must not share cookies.

Rejected alternative: a `sign.karmakoders.com` app would isolate Puppeteer and deploys but splits billing identity and SEO until a reverse proxy is added.
