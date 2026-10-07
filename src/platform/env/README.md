# platform/env

Lazy, feature-scoped Zod validation for KarmaKoders Sign and shared platform services.
Server vars live behind `server-only` getters; client (`NEXT_PUBLIC_*`) getters are safe for browsers.
Nothing validates at import or build time so the marketing site still builds without Sign secrets.
