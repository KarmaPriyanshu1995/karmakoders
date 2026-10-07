# Product requirements — KarmaKoders Sign

Status: confirmed for v1. English only. USD only. Lives in this Next.js app at `/tools/sign`.

## 1. Product

**KarmaKoders Sign** is a freemium e-signature product for NDAs, NOCs, contractor agreements, and everyday business documents.

**Promise:** create and e-sign a document in under 60 seconds. Signers never create accounts. Flat pricing, no per-seat fees.

**Brand:** KarmaKoders visual system (dark neutrals, `#FFC300` accent). Feels like a polished SaaS utility, not a developer console.

## 2. Audience

| Market | US, UK, Canada, Australia, Western Europe |
| Language | English |
| Currency | USD |

### Personas

1. **Agency owner** — sends NDAs and contractor agreements every week; wants speed and a professional PDF, not a DocuSign invoice.
2. **HR manager / HR consultant** — offer letters, acknowledgments, consent forms; needs an audit trail if a hire disputes a signature.
3. **Freelancer** — one-off service agreements; pays with credits, not a team plan.
4. **Signer** — receives an email, opens a phone browser, signs or declines. **No account.**

## 3. v1 document templates

Slugs below are the exact, canonical slugs from `src/modules/sign/templates/catalog.ts`. The catalog is the source of truth; if this table and the catalog ever differ, the catalog wins.

| Slug | Name |
|---|---|
| `mutual-nda` | Mutual NDA |
| `one-way-nda` | One-way NDA |
| `independent-contractor-agreement` | Independent Contractor Agreement |
| `freelance-service-agreement` | Freelance / Service Agreement |
| `no-objection-certificate` | No Objection Certificate (NOC) |
| `offer-letter` | Offer Letter |
| `consent-release-form` | Consent / Release Form |
| `acknowledgment-receipt` | Acknowledgment / Receipt |

**Upload your own PDF** is a separate flow at `/tools/sign/new/upload`. It is intentionally **not** a catalog entry: it has no template fields or clauses, only field placement on the uploaded file. The templates index links to it as its own card.

Templates support logo, party names, dates, and signature blocks. Upload-PDF is field placement on an existing file, not clause editing.

## 4. v1 features (must ship)

- Passwordless **email OTP** login for **senders**
- Multiple signers; **parallel** or **sequential** order
- Signer **email OTP** + explicit **e-sign consent**
- Signature capture: **draw**, **type**, **upload**
- Decline with reason
- Reminders
- Void
- Signing link expiry
- Tamper-evident **audit trail**
- **Audit certificate** page (and PDF appendix)
- **SHA-256** hash of the final PDF
- **Public verification** page
- Monetization: free tier, **credit packs**, **Sign Pro**, **All Access** via **Paddle**
- **Basic admin** (staff): users, documents, payments, failed webhooks

## 5. Pricing

### Free

- 3 **sent** documents per **calendar month**
- Max **2 signers** per document
- KarmaKoders footer on the document / emails

### Credit packs (one-time)

Credits **never expire** and are **shared across all current and future KarmaKoders tools**.

| Pack | Price (USD) | Credits |
|---|---|---|
| Starter | $10 | 10 |
| Value | $25 | 30 |

**1 credit = 1 sent document** (the send event consumes the credit, not the signature). Each credit sends one document with Pro features: up to **10 signers** per document and **no KarmaKoders footer**.

### Subscriptions

| Plan | Monthly | Yearly |
|---|---|---|
| **Sign Pro** | $15 | $150 |
| **All Access** | $29 | $290 |

All Access covers Sign and every current and future KarmaKoders tool. No per-seat fees. Both subscriptions allow up to **10 signers** per document and remove the KarmaKoders footer.

**Pay only at send** when the user is over free quota and has no included entitlement: checkout or spend credits before the document is submitted to signers.

## 6. Out of scope (v1)

- Bulk send
- Team seats / orgs beyond a single sender account
- Customer API / webhooks for customers
- White-label
- AI clause generation
- Qualified or advanced electronic signatures (eIDAS QES/AdES)
- Notarization or wet-ink workflow
- Native mobile apps
- Languages other than English
- Currencies other than USD

## 7. Blocked document types (must refuse)

Do not market, template, or knowingly process:

- Wills, codicils, testamentary trusts
- Court filings and court-ordered documents
- Adoption, divorce, and other family-law documents
- Notarized or witnessed deeds / instruments that require a notary or wet ink
- Anything the UI copy states requires wet ink

Show a persistent legal disclaimer: KarmaKoders Sign provides **simple electronic signatures**. It is not a law firm. Users must confirm the document is eligible in their jurisdiction.

## 8. Success metrics (first 90 days after launch)

| Metric | Target |
|---|---|
| Landing → first document **sent** | **< 2 minutes** (p50 new sender who completes) |
| Signer completion rate (signed / (signed + declined + expired)) | **> 80%** |
| Free → paid conversion | **3–5%** |
| Paying customers | **First 25** |

Instrument with PostHog: `sign_landing_view`, `sign_otp_verified`, `sign_document_created`, `sign_document_sent`, `sign_viewed`, `sign_signed`, `sign_declined`, `sign_checkout_started`, `sign_purchase`.

## 9. Non-functional

| Area | Bar |
|---|---|
| LCP | < 2.5s on 4G for landing, compose, and signer pages |
| Lighthouse mobile | 90+ on `/tools/sign` and `/tools/sign/s/[token]` |
| Availability | 99.9% for Sign APIs and signer links |
| Files | Encrypted at rest (AES-256-GCM in-app, plus R2 encryption) |
| Retention | Signed documents **7 years** unless the owner deletes |
| A11y | WCAG 2.1 AA |
| Browsers | Last 2 versions of Chrome, Safari, Edge, Firefox; iOS Safari; Android Chrome |

## 10. User stories

Each story has 2–3 acceptance criteria. “I” is the persona in the title.

### S1 — Pick a template with live preview

**As an** agency owner, **I want** to browse templates and see a live preview **so that** I know the NDA looks professional before I add parties.

1. `/tools/sign/templates` lists all v1 catalog templates plus a separate “Upload PDF” card (→ `/tools/sign/new/upload`); each card shows name, one-line use, and a preview affordance.
2. `/tools/sign/templates/[slug]` shows a readable preview (HTML template or first-page PDF) that updates when I change sample party names if the template supports it.
3. Blocked-type copy is visible before I continue; Continue goes to compose (`/tools/sign/new/[template]`) without requiring payment.

### S2 — Add a logo

**As an** HR manager, **I want** to add my company logo **so that** offer letters match our brand.

1. On compose, I can upload a PNG or SVG (reasonable size cap, e.g. 2 MB) or skip.
2. The preview shows the logo in the header/letterhead region; I can remove it.
3. The logo is stored encrypted with the document draft and appears on the final PDF.

### S3 — Add signers and signing order

**As a** freelancer, **I want** to add everyone who must sign and choose parallel or sequential order **so that** my client signs after I do, or everyone can sign at once.

1. I can add 1–N signers (name + email); Free tier blocks send if N > 2 with a clear upgrade/credit message.
2. I choose **parallel** (all links active) or **sequential** (only the current signer’s link is valid).
3. Invalid emails are rejected before send; I can reorder sequential signers with keyboard-accessible controls.

### S4 — Pay only at send

**As a** sender, **I want** to prepare the document for free and only pay (or use a credit) when I send **so that** I am not charged for drafts I abandon.

1. Creating a draft never decrements credits or free quota.
2. On Send, the app checks: remaining free sends this calendar month → else Sign Pro / All Access entitlement → else wallet credits → else Paddle checkout for a pack or subscription.
3. If checkout is required, the document stays unsent until Paddle confirms; on success, send proceeds once. Duplicate clicks do not double-charge.

### S5 — Track views and signatures; remind

**As an** agency owner, **I want** to see who opened and who signed, and to send a reminder **so that** deals do not stall in someone’s inbox.

1. `/tools/sign/documents/[id]` shows each signer: not sent / sent / viewed / signed / declined / expired, with timestamps.
2. I can send a reminder to signers who have not signed or declined; reminders are rate-limited (product: max 1 per signer per 24 hours unless sequential just became their turn).
3. Opening the signing link records a **view** without counting as a signature.

### S6 — Void a document

**As an** HR manager, **I want** to void a packet that went to the wrong person **so that** nobody can still sign it.

1. Owner can void a document that is not completed; signing links immediately return a “voided” state.
2. All parties who already received an email get a void notification; the audit trail records who voided and when.
3. Completed (fully signed) documents cannot be voided; the UI explains they may only be retained or deleted per retention rules.

### S7 — Sign on a phone without an account

**As a** signer, **I want** to open the email on my phone, confirm it is me, and sign **so that** I never create a KarmaKoders account.

1. `/tools/sign/s/[token]` works on a mobile viewport without Nav marketing chrome blocking the CTA; Lighthouse mobile target applies.
2. I complete email OTP (or equivalent possession of the link + OTP) and tick an e-sign consent checkbox before the signature pad is enabled.
3. I can draw, type, or upload a signature; after I confirm, I see a success state. I am not prompted to register.

### S8 — Decline with a reason

**As a** signer, **I want** to decline and say why **so that** the sender knows this is not a signature.

1. Decline is available after OTP, before or instead of signing.
2. A reason is required (short text, max length enforced); the document status becomes declined for sequential flows (stops the chain) and records the reason in the audit trail.
3. Sender and remaining signers are notified; remaining signing links are disabled.

### S9 — Receive the final PDF with an audit certificate

**As a** sender or signer, **I want** the completed PDF plus an audit certificate **so that** I can file it with accounting or HR.

1. When the last required signature is in, all parties receive email with a download link (authenticated for sender; tokenized for signers).
2. The PDF contains the signed content plus a certificate appendix (who, when, IP/user-agent summary, hash).
3. The SHA-256 of the stored bytes is shown to the sender on the document page and embedded on the certificate.

### S10 — Verify a signed PDF

**As anyone** holding a PDF, **I want** to look up a public ID or hash **so that** I can check it was issued by KarmaKoders Sign and not altered.

1. `/tools/sign/verify/[publicId]` is public (no login), rate-limited, and does not leak other customers’ documents.
2. A match shows issued-at, signer names (as on the certificate), and whether the stored hash is intact.
3. Unknown IDs and mismatch states are explicit; the page never offers a download of someone else’s file without the original link/token policy.

### S11 — Admin: users, documents, payments, failed webhooks

**As** KarmaKoders staff, **I want** a basic admin view **so that** I can support customers and replay billing failures.

1. Staff (existing CMS NextAuth + permission) can open **`/admin/sign`**: searchable senders, document status, Paddle transactions, credit balances.
2. Failed Paddle webhooks are listed with payload metadata (no raw secrets), timestamp, and a **retry** action that re-runs the handler idempotently.
3. Admin cannot silently alter a completed document’s hash; support actions (void exception, refund note) are themselves audit-logged.

## 11. Send and complete — product rules

- **Sent document** = owner confirmed Send and the system accepted entitlement (free/sub/credit/payment). That event consumes quota/credit.
- Drafts, voids before send, and failed checkouts do not consume.
- Sequential: only current signer’s token works.
- Expiry: unsigned packets expire at the configured time; status `expired`; no further signatures.
- Owner delete: allowed per policy; legal hold is out of scope for v1 beyond 7-year default retention.

## 12. Analytics and admin events

PostHog on product; Sentry on API and PDF service. Paddle is merchant of record (VAT/GST). KarmaKoders does not store pan card / full card numbers.
