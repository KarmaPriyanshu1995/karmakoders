/**
 * Copy for /tools/sign (spec: docs/specs/task-3b-public-pages.md §1).
 * No certification claims (no SOC 2, HIPAA, ISO) — enforced by tests.
 */

export const LANDING_HERO = {
  title: "Create and e-sign NDAs, NOCs and contracts in under 60 seconds.",
  subtitle:
    "Signers don't need an account. Flat pricing with no per-seat fees, so you only pay for what you send.",
} as const;

export const HOW_IT_WORKS = [
  {
    title: "Pick a template",
    body: "Choose an NDA, NOC, contractor agreement or offer letter, or upload your own PDF.",
  },
  {
    title: "Fill in and add signers",
    body: "Add party names, dates and your logo, then add signers in parallel or in order.",
  },
  {
    title: "Send and track",
    body: "Signers get a secure link by email. See who opened and signed, and send reminders.",
  },
] as const;

export const FEATURES = [
  { title: "Signers need no account", body: "Signers verify by email code and sign from any phone or browser." },
  { title: "Audit trail and certificate", body: "Every view, consent and signature is recorded and attached as a certificate." },
  { title: "Tamper-evident SHA-256 hash", body: "The final PDF is hashed so any later change is detectable." },
  { title: "Public verification", body: "Anyone holding the PDF can check its ID and hash on a public verification page." },
  { title: "Secure expiring links", body: "Signing links are unguessable, single-purpose and expire automatically." },
  { title: "Your logo", body: "Add your company logo so documents match your brand." },
  { title: "Reminders", body: "Nudge signers who haven't signed yet, without chasing them by hand." },
] as const;

export const SECURITY_POINTS = [
  "Supports simple electronic signatures under the US ESIGN Act and UETA, EU eIDAS and UK law.",
  "Files are encrypted at rest (AES-256-GCM) and stored privately.",
  "Each signer confirms their email with a one-time code and gives explicit consent before signing.",
] as const;

export const LANDING_FAQ = [
  {
    question: "Do signers need a KarmaKoders account?",
    answer: "No. Signers open the emailed link, confirm a one-time code and sign. They never create an account.",
  },
  {
    question: "Are these signatures legally binding?",
    answer:
      "KarmaKoders Sign provides simple electronic signatures, which are recognised for most business documents under the US ESIGN Act and UETA, EU eIDAS and UK law. Some documents legally require wet ink or a notary; those are not supported.",
  },
  {
    question: "Which documents can't I send?",
    answer:
      "Wills and testamentary documents, court filings, adoption, divorce and other family-law documents, notarised or witnessed deeds, and anything that requires wet-ink signatures.",
  },
  {
    question: "How much does it cost?",
    answer:
      "You can send 3 documents a month for free. After that, buy credit packs (1 credit = 1 sent document) or subscribe to Sign Pro or All Access. There are no per-seat fees.",
  },
  {
    question: "Can I use my own document?",
    answer: "Yes. Upload a PDF and place signature fields on it, or start from one of our templates.",
  },
  {
    question: "How do I prove a document wasn't changed?",
    answer:
      "Every completed document gets an audit certificate and a SHA-256 hash. Anyone can check the document's ID and hash on the public verification page.",
  },
  {
    question: "Is KarmaKoders a law firm?",
    answer:
      "No. Templates are provided for convenience and are not legal advice. Review important agreements with a qualified lawyer for your jurisdiction.",
  },
] as const;

export const FINAL_CTA = {
  title: "Send your first document in under a minute",
  body: "Pick a template, add your signers and send. Your first 3 documents each month are free.",
} as const;
