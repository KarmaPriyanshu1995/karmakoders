# Task 3B - Public pages for KarmaKoders Sign

General: Server Components by default; only the pricing toggle, FAQ accordions and the
early-access form may be Client Components. Brand tokens #252422, #1C1B1A, #FFC300,
#FFFFFF, #A39F97; text on #FFC300 is always #1C1B1A. Match the existing site's style.
WCAG 2.1 AA (contrast, keyboard navigation, visible focus). Marketing pages use the
(marketing) layout with the site Navbar/Footer.

## 1. Landing /tools/sign
- Hero: "Create and e-sign NDAs, NOCs and contracts in under 60 seconds." Subtext:
  signers need no account; flat pricing, no per-seat fees. Primary CTA per launch
  switch; secondary CTA "See pricing".
- How it works: 3 steps (pick a template; fill in and add signers; send and track).
- Template grid from the catalog, linking to each template page.
- Features: signers need no account; audit trail and certificate; tamper-evident
  SHA-256 hash; public verification; secure expiring links; your logo; reminders.
- Security and legal: supports simple electronic signatures under the US ESIGN Act and
  UETA, EU eIDAS and UK law; files encrypted; not for the blocked document types
  (list BLOCKED_DOCUMENT_TYPES). No certification claims (no SOC 2, HIPAA, ISO).
- FAQ (6-8 questions), final CTA, early-access form section.

## 2. Pricing /tools/sign/pricing
- Plan cards from src/platform/billing/plans.ts: Free, Credits (10 for $10,
  30 for $25), Sign Pro, All Access; Monthly/Yearly toggle with "2 months free" on
  yearly.
- Buttons follow the launch switch. The button component must be structured so a
  later step can swap in Paddle checkout without redesign.
- Feature comparison table by plan.
- Billing FAQ: what a credit is; credits never expire and work across KarmaKoders
  tools; cancel anytime; refunds (link to refund policy); taxes calculated at
  checkout; payments processed by Paddle.
- Under the plans: "Prices in USD. Taxes may apply depending on your location."
- Statement: "Our order process is conducted by our online reseller Paddle.com.
  Paddle.com is the Merchant of Record for all our orders. Paddle provides all
  customer service inquiries and handles returns."

## 3. Templates
- /tools/sign/templates: grid of all catalog templates (name, shortDescription,
  category, link). H1 "Free e-signature templates", short intro, CTA.
- /tools/sign/templates/[slug]: H1 "<Name> template - free e-signature";
  longDescription; "Who uses it"; "Fields you'll fill in" (required marked); signer
  roles; FAQ accordion; CTA; 2-3 related templates (same category first); disclaimer
  "This template is provided for convenience and is not legal advice. Review it with a
  qualified lawyer for your jurisdiction." generateStaticParams for all slugs; unknown
  slug returns notFound().

## 4. Legal pages under /legal
/legal/terms, /legal/privacy, /legal/refund-policy, /legal/esign-disclosure,
/legal/acceptable-use. If /legal already exists, reuse its layout and list any
existing pages before changing them.
- Operator: Karmakoders Technologies, a partnership firm in India, Jaipur, Rajasthan.
  Contact support@karmakoders.com. Clearly marked placeholder for the full registered
  address: [REGISTERED ADDRESS - TO BE FILLED].
- Terms include the Paddle merchant-of-record statement above.
- Refund policy: full refund within 14 days of purchase for unused credit packs and
  for the first payment of a new subscription; used credits are non-refundable;
  subscriptions can be cancelled anytime and stay active until the end of the paid
  period; refunds processed by Paddle.
- Privacy: data collected (account email, documents and signer details, signer IP,
  user agent and timestamps for the audit trail); purposes; processors (Paddle,
  Vercel, Neon, Cloudflare, Resend, Upstash); retention (signed documents 7 years
  unless deleted by the owner); rights under GDPR/UK GDPR and CCPA; international
  transfers; contact for requests.
- E-sign disclosure: consent to electronic records; right to request a paper copy;
  how to withdraw consent; hardware/software requirements.
- Acceptable use: no illegal documents, fraud, impersonation or blocked document types.
- Each page shows "Last updated" and contains an HTML comment (not visible):
  "DRAFT - requires lawyer review before accepting live payments".

## 5. Contact /tools/sign/contact (or reuse an existing contact page)
Support email, business name, address placeholder, response time 1-2 business days.

## 6. Footer
Sign footer links to all 5 legal pages and contact; add them to the site footer's
legal section if one exists.

## 7. SEO
- Unique title and description per page; canonical URLs under
  https://www.karmakoders.com; Open Graph and Twitter tags.
- JSON-LD: SoftwareApplication with Offer entries from plans.ts (landing, pricing);
  FAQPage where FAQs exist; BreadcrumbList on template pages.
- All public URLs added to the existing sitemap (extend it, don't replace it).
- noindex on app routes, signer routes and the login page.

## 8. Performance and tests
- No client JS beyond the allowed interactive parts; next/image; no layout shift.
  Target Lighthouse mobile 90+ on /tools/sign and /tools/sign/pricing.
- Test that every internal href in src/app/tools/sign and src/app/legal resolves to an
  existing route.

---

## Decisions (2026-10-07, confirmed by the product owner)

| Topic | Decision |
|---|---|
| Existing CMS legal pages | The site already publishes CMS pages at `/privacy`, `/terms`, `/refund-policy`, `/cookie-policy` (agency site). They stay unchanged. The `/legal/*` pages are **KarmaKoders Sign-specific** policies. The site footer's Legal column gains labelled links to them ("Sign Terms", "Sign Privacy", …). |
| Template preview | Spec §General wins over PRD S1 criterion 2: the template preview is a **static, server-rendered** sample (fixed sample names), not a live client preview. |
| Pricing comparison table | Only rows sourced from `plans.ts` / PRD are shown. **Pending from the product owner:** signers per document on paid plans; whether credit sends carry the KarmaKoders footer. Tracked as `PENDING_COMPARISON_FACTS` in `plans.ts`. |
| Contact (§5) | **Reuse the existing CMS `/contact` page**; no `/tools/sign/contact`. Support email, business name, address placeholder and the 1–2 business day response time must be added to that CMS page by the product owner; the legal pages also carry them. |
| FAQ accordions | Built with native `<details>`/`<summary>` (server-rendered, keyboard accessible, zero client JS), so answers are in the HTML and match the FAQPage JSON-LD. Only the pricing toggle and the early-access form are Client Components on public pages. |
| CTAs | Every CTA follows `SIGN_APP_ENABLED` (early access when false, "Get started" → login when true) via `src/modules/sign/launch`. |
