# platform/auth

Passwordless email OTP for product customers (`kk_session` cookie) and helpers for signer tokens.
Never uses NextAuth `getServerSession` for customers; CMS staff remain on `/api/auth` + NextAuth.

## Routes

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/platform/auth/otp/request` | Send 6-digit OTP (10 min TTL) |
| POST | `/api/platform/auth/otp/verify` | Verify OTP → set `kk_session` |
| POST | `/api/platform/auth/logout` | Revoke session + clear cookie |
| GET | `/api/platform/auth/me` | Current customer or 401 |
