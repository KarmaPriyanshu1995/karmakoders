# platform/email

Resend + HTML helpers for OTP, signing invites, reminders, void notices, and completed PDFs.
`RESEND_API_KEY` and `EMAIL_FROM` are required in every environment (use a Resend test key locally);
a missing key throws a configuration error at first send. OTP codes and email bodies are never logged —
logs carry only the event type and a masked recipient (`j***@example.com`).

Keeps templates and send helpers out of route handlers so Inngest jobs can reuse them.
