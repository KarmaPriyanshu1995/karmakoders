# platform/rate-limit

Upstash Redis rate limiting for OTP, signing links, and send locks across Vercel instances.
In-memory limiting is allowed only when `NODE_ENV` is `development` or `test`. In production, missing
Upstash config throws at first use (never at import/build), and Upstash runtime errors fail CLOSED (deny).
Keys may contain emails/IPs and are never logged.
