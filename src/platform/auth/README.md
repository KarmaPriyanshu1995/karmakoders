# platform/auth

Passwordless email OTP for product customers and helpers for signer tokens. Session cookie
`kk_session` (`__Host-kk_session` in production). Never uses NextAuth `getServerSession` for
customers; CMS staff remain on `/api/auth` + NextAuth. Full design and threat model: `docs/AUTH.md`.

## Routes (all 404 while SIGN_APP_ENABLED is off; POSTs are origin-checked)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/platform/auth/otp/request` | Send 6-digit OTP (10 min TTL); 3/10 min per email, 10/h per IP |
| POST | `/api/platform/auth/otp/verify` | Verify OTP → new session cookie; 20/h per IP, 5 attempts per code |
| POST | `/api/platform/auth/logout` | Revoke this session + clear cookie |
| POST | `/api/platform/auth/logout-all` | Revoke every session of the customer |
| GET | `/api/platform/auth/me` | id, email, name, creditsBalance, active subscriptions — or 401 |

## Helpers

`getCurrentCustomer()` / `getCurrentSession()` (per-request cached), `requireCustomer()`,
`revokeSession()`, `revokeAllSessions()`, `safeNextPath()`, `buildLoginHref()`.
