# sign/signing

Signer-facing flow: link exchange, signer session, OTP, e-sign consent, draw/type/upload capture,
decline with reason. Coordinates with signers + documents modules; no CMS auth.

| File | What |
|---|---|
| `constants.ts` | Client-safe: cookie name, TTL, token format, paths, response headers. |
| `signer-access.ts` | `createSignerToken`, `resolveSignerToken`, `evaluateSignerAccess` (the state rules). |
| `signer-session.ts` | `startSignerSession` (exchange + OPENED), `getCurrentSigner`, `requireSigner`. |
| `signer-otp.ts` | `requestSignerOtp` / `verifySignerOtp` on the platform OTP core (OTP_SENT / OTP_VERIFIED). |

These — and `sign/documents/access.ts` for senders — are the only modules that query
`signDocument` / `signSigner` / `signSignerSession`. Never log or persist a raw link token.
