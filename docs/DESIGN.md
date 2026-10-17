# Design system: KarmaKoders Sign

Sign is part of the karmakoders.com design system, not a separate one. It uses the site's dark black-and-yellow theme, the site's Tailwind classes and the existing `product-ui` components. This document lists what Sign reuses, the few things it adds, and the rules every Sign screen follows.

Live reference: run `npm run dev` and open **`/tools/sign/dev/ui`** (development only; 404 everywhere else). It shows every component, variant and state, plus a contrast table.

## 1. One theme

- Sign has **one theme**: the site's dark theme. There is no light theme, no `prefers-color-scheme` switch, no `data-theme` and no white UI surfaces. The only white surface is the document preview (§9).
- There is no Sign token layer: no `tokens.css`, no `@theme` additions and no `.sign-ui` scope. Sign uses the site's Tailwind classes and the remaps below.
- **The CMS must stay in dark mode.** The root layout reads `SiteConfig.globalTheme.mode`. If an admin switches *Appearance → Base Theme Mode* to **Light**, the site remaps `.text-white` to `#1C1B1A`. Sign pages keep their dark backgrounds, so their text would turn dark on dark. Sign supports `mode = "dark"` only.
- Sign shells force Inter with `font-[family-name:var(--font-inter)]`, so a different CMS font choice does not reach Sign.

### How the site theme is applied

| Layer | What it does |
|---|---|
| `src/app/layout.tsx` | Injects `:root` variables (`--primary-accent #FFC300`, `--main-bg #252422`, `--secondary-bg #1C1B1A`, `--primary-text #FFFFFF`, `--secondary-text #A39F97`, `--border-color` 8% white) and `!important` class overrides. |
| Tailwind remaps | `indigo-400/500/600` → `#FFC300`. `slate-50…300` → white. `slate-400…600` → `#A39F97`. Radius from `--radius`. |
| Class overrides | `.bg-slate-950` → `#252422`, `.bg-slate-900` → `#1C1B1A`, `.border-white/5` and `.border-white/10` → 8% white, `.text-white` → `--primary-text`, `.text-slate-950` and `.text-[#1C1B1A]` → `#1C1B1A`. |
| `globals.css` | `.glass`, `.glass-card`, `.glow-hover`, `.text-glow`; Inter as `--font-sans`. |

Do not edit the root layout, `globals.css`, the site Navbar or Footer, or `src/components/ui` for Sign.

## 2. Palette

| Role | Value | Class |
|---|---|---|
| Page background | `#252422` | `bg-[#252422]` (or `bg-slate-950`) |
| Raised panel | `#1C1B1A` | `bg-[#1C1B1A]` |
| Glass surface | white 5% | `bg-white/5 backdrop-blur-xl` |
| Header and menu panel | slate-950 95% | `bg-slate-950/95 backdrop-blur-xl` (the Navbar dropdown panel) |
| Accent | `#FFC300` | `bg-[#FFC300]`, `text-[#FFC300]` |
| Text on accent | `#1C1B1A` | `text-[#1C1B1A]` |
| Text | `#FFFFFF` | `text-white` |
| Muted text | `#A39F97` | `text-[#A39F97]` |
| Hairline border | white 8% | `border-white/10` |
| Field border | white 35% | `border-white/35` (Sign inputs only, 3.2:1) |

### Semantic colours

These follow the site's pattern `bg-{c}-500/10 border-{c}-500/20 text-{c}-400`. They are defined once in `src/modules/sign/ui/colors.ts`, with contrast tests in `colors.test.ts`.

| Tone | Classes | Text on its tint, over #252422 / #1C1B1A |
|---|---|---|
| neutral | `border-white/15 bg-white/5 text-[#A39F97]` | ≥ 5.3 : 1 |
| info | `… blue-500 … text-blue-400` | 5.26 / 5.84 |
| warning | `… amber-500 … text-amber-400` | 7.54 / 8.43 |
| success | `… emerald-500 … text-emerald-400` | 6.88 / 7.68 |
| danger | `… rose-500 … text-rose-400` | 5.02 / 5.56 |

| Fixed pair | Ratio |
|---|---|
| `#1C1B1A` on `#FFC300` (primary button) | 10.69 |
| white on `rose-600` (danger button) | 4.51 |
| `#A39F97` on `#252422` / `#1C1B1A` | 5.88 / 6.52 |
| `rose-300` field error on `#252422` | 8.07 |

## 3. Typography

Inter only. Use the site's classes:

| Use | Classes |
|---|---|
| Hero | `text-4xl md:text-5xl font-black tracking-tight text-white` |
| Page heading (h1) | `text-3xl font-black tracking-tight text-white` |
| Section heading (h2) | `text-2xl font-black tracking-tight text-white` |
| Card title | `text-lg font-semibold text-white` |
| Eyebrow, accent | `text-sm font-bold uppercase tracking-widest text-[#FFC300]` |
| Eyebrow / label, muted | `text-xs font-bold uppercase tracking-widest text-[#A39F97]` |
| Body | `leading-relaxed text-white`; supporting text `text-sm text-[#A39F97]` |

**Signature fonts** (Dancing Script, Great Vibes, Caveat) are loaded with `next/font` **only** in `src/modules/sign/ui/typed-signature.tsx`. Pages render it through `TypedSignatureLazy` (`typed-signature-loader.tsx`, `next/dynamic`). No layout, barrel or other module may import them; `signature-fonts.test.ts` enforces this.

**tailwind-merge:** never invent text size names such as `text-body` or `text-caption`. `cn()` treats an unknown `text-*` as a colour and drops the real colour (for example a primary button's `text-[#1C1B1A]`). Use Tailwind's sizes (`text-sm`, `text-base`, …). The Sign `Button` applies its colour classes after the caller's `className`, and `button.test.tsx` guards this.

## 4. Reuse map

Sign components live in `src/modules/sign/ui`. Server-safe parts (colours, status, `Button`, `Card`, badges, alerts and states, display pieces, `DocumentFrame`) are exported from `@/modules/sign/ui`. **Client components are imported by path** (`@/modules/sign/ui/form`, `/dialog`, `/dropdown-menu`, `/tabs`, `/tooltip`, `/toast`, `/copy-button`, `/account-menu`, `/typed-signature-loader`), because the public marketing pages import the barrel and must not pull Radix into their bundle. `public-pages.test.ts` guards this.

**Client code never imports the barrel either.** It also exports server-only marketing components (the pricing components read `plans.ts`), so a `"use client"` file that imports `@/modules/sign/ui` breaks the page at runtime. Client files import each module by path (`@/modules/sign/ui/button`, `/status-badge`, …). `client-imports.test.ts` guards this.

| Sign component | Built from |
|---|---|
| `Button` (primary, secondary, ghost, link, danger; sm/md/lg; `loading`, `loadingText`, `icon`, `asChild`) | product-ui `Button` (default, glass, ghost, link, destructive), plus 44px height, `ring-2` yellow focus ring, `bg-rose-600` danger, reduced motion |
| `IconButton` (required `aria-label`) | product-ui `Button size="icon"` at 44 × 44 |
| `Input` | product-ui `Input` plus `border-white/35`, solid yellow focus ring, rose border when invalid |
| `Textarea`, `Select` | product-ui `Input` classes on native elements; `Select` stays native (best on phones) with dark options |
| `Checkbox`, `Radio`, `RadioGroup`, `Switch` | Native inputs with `accent-[#FFC300]` and the site focus ring; `Switch` is `role="switch"` |
| `FormField` | product-ui `Label` plus hint, error (`role="alert"`, `text-rose-300` like the login form), `aria-describedby`, `aria-invalid` and `required` wiring |
| `Card` | product-ui `Card` when `interactive`; the same surface without the hover lift when static |
| `StatusBadge`, `ToneBadge` | product-ui `Badge` plus the semantic tone, an icon and a text label |
| `Tabs` | product-ui `Tabs` with 44px triggers and a stronger focus ring |
| `Dialog`, `ConfirmDialog`, `DropdownMenu`, `Tooltip` | Radix primitives styled as the site Navbar dropdown panel (`PANEL_CLASSES`) |
| `Alert`, `EmptyState`, `ErrorState` | The `LegalDisclaimer` panel shape tinted by tone; the Footer's icon chip |
| `notify` (toasts) | The root layout's Sonner `<Toaster>` (no second toaster). Each toast is `unstyled` with dark panel classes, because the root toaster's `richColors` would paint light toasts |
| `Skeleton`, `Stepper`, `Avatar`, `CreditBalanceChip`, `ProgressMeter`, `CopyButton`, `Kbd` | Site chip, card and badge classes |
| `DocumentFrame` | White page in a dark frame (§9) |
| `AccountMenu` | `DropdownMenu` plus `Avatar` for the app header |

Icons: `lucide-react` only, `aria-hidden` when there is a text label.

## 5. Layouts

| Area | Route group | Chrome |
|---|---|---|
| Marketing (landing, pricing, templates, legal) | `(marketing)` | Site Navbar and Footer. Unchanged. |
| Login | `(app)` | The original minimal Sign header. Unchanged, guarded by `login-baseline.test.ts`. |
| Logged-in app (dashboard, documents, new document, billing, settings) | `(workspace)` | Compact header in the Navbar style: wordmark + "Sign" tag, section nav (Documents, Templates, Billing, Settings: inline from `lg`, always in the account menu), a primary **New document** button (icon-only below `sm`, same accessible name), credit balance, account menu |
| Signer pages | `(signer)` | `SignerShell`: the sender's company name (else the wordmark, not a link), "Secured by KarmaKoders Sign", no site navigation; footer links to the e-sign disclosure and privacy policy |

The floating **Book a call** and **WhatsApp** widgets are hidden on logged-in app pages (`src/modules/sign/app-paths.ts`) and signer pages (`isSensitivePath`). They stay on marketing pages and the login page.

### Sender screens

Each logged-in page is a thin server page that loads data and renders a **presentational screen** from `src/modules/sign/ui/screens/` with a typed **view model** (`src/modules/sign/ui/view-models.ts`). Screens never call the database or an API. Real routes show only real data: where data isn't wired yet, the page renders the screen's **empty state** (`screens/empty-view-models.ts`) with a `TODO(Step N)`. **Fixtures** in `src/modules/sign/ui/fixtures/` are for the dev preview and tests only; `workspace-routes.test.ts` fails if any file under `(workspace)` imports them. Screens are imported by path and never added to the ui barrel. Every screen in every fixture state is previewed at **`/tools/sign/dev/screens`** (development only).

- Documents list: a table from `md` up (`hidden md:table`) and cards below it (`md:hidden`). Filters and search are links and a GET form, so they work without JavaScript.
- Placeholders: actions that are not wired yet (remind, void, duplicate, download, send, checkout) show an info toast that says so and change nothing.
- **Signer colours** (upload field placement): `src/modules/sign/ui/signer-colors.ts` has ten hues as `border-{hue}-700 bg-{hue}-50 text-{hue}-900` on the white page. Text is at least 4.5 : 1 on its tint and borders at least 3 : 1 on white (`signer-colors.test.ts`). Every placed field also shows the signer's initials, and a legend lists the signers, so colour is never the only indicator.

### Signer screens

Signer pages follow the same pattern: presentational screens in `src/modules/sign/ui/screens/signer/` with view models in `src/modules/sign/ui/signer-view-models.ts`, fixtures in `fixtures/signer.ts` (dev preview and tests only; `signer-routes.test.ts` fails if `(signer)` imports them), and every screen and state in the dev preview under **Signer screens**. Screens never call an API: the page passes `actions`. Real routes show only real data (document title, the sender's company or name, the masked email, the sender's message) through `getSignerPageDetails` (`src/modules/sign/signing/signer-view.ts`).

- **Flow:** verify email (6-digit code, `autocomplete="one-time-code"`, numeric, paste-friendly, resend countdown) → consent (plain-language summary, checkbox, link to the full disclosure, "Decline to sign") → review → sign → done. Decline is available from consent and review; the reason is required (PRD S8, max `DECLINE_REASON_MAX`) and confirmed with `ConfirmDialog`.
- **Review:** each page is a `DocumentFrame` at `aspect-[8.5/11] w-full` with text in container units (`text-[length:…cqw]`), so it fits the width with no sideways scroll; pinch-zoom is never disabled. The signer's fields are outlined and labelled; other signers' fields are muted and say "Another signer". Every field is at least 44 px tall.
- **Bottom bar (phones):** fixed, within thumb reach: "2 fields left", **Next field** (scrolls to and focuses it), then **Finish**. `SignerShell reserveBottomBar` keeps its height from the first render, so nothing shifts. From `md` the same controls sit in a sticky toolbar.
- **Sign dialog:** `DialogContent layout="sheet"` (bottom sheet below `sm`, dialog from `sm`). Tabs **Draw** (`signature-pad.tsx`, pointer events for mouse, touch and pen, undo and clear), **Type** (the full keyboard alternative, `TypedSignatureLazy`) and **Upload** (PNG/JPG, `SIGNATURE_IMAGE_MAX_BYTES`, limit shown), with an adopt preview. The intent statement sits beside the **Sign** button and is linked with `aria-describedby`. The dialog is loaded with `next/dynamic` only when opened, so the pad and the signature fonts never load with the signer layout (`signature-fonts.test.ts`).
- **States:** link invalid, not your turn, session expired, document voided while signing, already signed, network error with retry (`signer-state-screen.tsx`). The 5B notices (`signer-notice.tsx`) render through it.
- **Placeholders:** consent, sign and decline are `TODO(Step 9)`; nothing is recorded and no document state changes.

## 6. Status vocabulary

Source: `src/modules/sign/ui/status.ts`. Every status has a label, a tone and an icon. Never show status by colour alone.

| Document status | Label | Tone | Icon |
|---|---|---|---|
| `DRAFT` | Draft | neutral | pencil |
| `SENT` | Waiting for signatures | info (blue) | clock |
| `PARTIALLY_SIGNED` | In progress, or "x of y signed" when counts are known | warning (amber) | pen line |
| `COMPLETED` | Completed | success (emerald) | check |
| `DECLINED` | Declined | danger (rose) | x |
| `EXPIRED` | Expired | neutral | hourglass |
| `VOIDED` | Voided | neutral | slash (ban) |

| Signer status | Label | Tone |
|---|---|---|
| `PENDING` | Not yet opened | neutral |
| `VIEWED` | Opened | info |
| `SIGNED` | Signed | success |
| `DECLINED` | Declined | danger |

## 7. Copy rules

- Plain English. Short sentences. Say "document", "signer" and "sign", not "envelope", "recipient" or "execute".
- **Sentence case** everywhere: headings, buttons, labels, menu items. (Labels are shown uppercase by CSS; write them in sentence case.)
- **Buttons are verbs** that say what happens: "Send for signature", "Void document", "Add signer", "Download PDF". Avoid "OK", "Submit" and "Yes".
- **Errors say what happened and what to do**: "We couldn't send the document. Check your connection and try again." Never blame the user; never show codes or stack traces.
- **Confirmations state the consequences**, including anything that cannot be undone. Cancel is focused by default.
- Loading text uses an ellipsis: "Sending…", "Checking…".
- Money is shown in USD from `src/platform/billing/plans.ts`. Credits are whole numbers: "1 credit", "30 credits".

## 8. Breakpoints and spacing

| Width | Target |
|---|---|
| 360 px | Smallest supported phone. Everything fits with no horizontal page scroll; below `sm` the header credit chip hides and the balance shows in the account menu. |
| 768 px (`md`) | Tablet: two-column forms and card grids. |
| 1024 px (`lg`) | Laptop. |
| 1280 px (`xl`) | Desktop: content stays at `max-w-5xl` (app) or `max-w-7xl` (header). |

Page gutters: `px-4 sm:px-6 md:px-12`. Sections are separated by `space-y-10`.

## 9. Document preview exception

The document being created or signed is shown as it will print: a **white page with dark text inside a dark frame** (`DocumentFrame`, and the existing `TemplatePreview`). This matches the signed PDF.

Inside the white page use `text-[#1C1B1A]` and `black/*` shades only. The site remaps `text-white` and the `text-slate-*` classes to light colours, which would vanish on white. The typed-signature choices also render on white for the same reason.

## 10. Accessibility (WCAG 2.1 AA)

- **Targets:** buttons, menu items, tabs and checkbox/radio/switch rows are at least **44 px** tall.
- **Focus:** every interactive element shows a visible yellow ring (`focus-visible:ring-2 ring-[#FFC300]`, offset against `#252422`).
- **Contrast:** text ≥ 4.5 : 1 and field borders ≥ 3 : 1 on both site backgrounds (tested in `colors.test.ts`).
- **Danger buttons** are `bg-rose-600` with white text. `rose-500` fails AA at 3.76 : 1.
- **Never colour alone:** statuses carry icon and text; errors carry an icon and text; the switch thumb moves; the stepper shows numbers, checks and labels.
- **Forms:** every control has a label; hints and errors are linked with `aria-describedby`; invalid fields get `aria-invalid`; errors are announced (`role="alert"`).
- **Dialogs** trap focus, close on Escape, and return focus to the element that opened them.
- **Loading** buttons are disabled, set `aria-busy`, and their label changes ("Sending…").
- **Motion:** every animation and hover lift has a `motion-reduce:` fallback.
- **Tooltips** hold only extra hints, never essential information (touch users cannot hover).
