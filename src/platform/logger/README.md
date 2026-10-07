# platform/logger

Structured JSON logs (`logEvent`) and `maskEmail` for platform and Sign services.
Fields named like code/token/otp/secret/password/key/html/body are dropped. Never log raw OTPs,
session or signer tokens, encryption keys, or document contents.
