# Performance diagnosis — root layout and the 4–5 s mobile LCP

Status: diagnosis only. Fixes go on a separate branch; this branch must not change `src/app/layout.tsx`.
Date: 2026-10-07. Measured on a local production build (`next build` + `next start`), Lighthouse 12, mobile
form factor, default **simulated** throttling (slow 4G, 4× CPU slowdown), Chrome 1xx headless.

## 1. Summary

| Page | Perf | A11y | LCP (simulated) | LCP (observed) | TBT | CLS |
|---|---|---|---|---|---|---|
| `/tools/sign` (before) | 55–75 | 89 | 4.7–5.3 s | 0.8 s | 210–1,200 ms | 0 |
| `/tools/sign/pricing` (before) | 73–78 | 90 | 4.5–5.3 s | 0.9 s | 190–460 ms | 0 |
| `/tools/sign` (after the in-branch fixes in §6) | 74 | 100 | 4.4 s | 1.3 s | 420 ms | 0 |
| `/tools/sign/pricing` (after) | 82 | 100 | 4.7 s | 0.8 s | 140 ms | 0 |

**The hero is not slow to paint.** In the real (observed) trace the H1 is painted at **0.8–1.3 s** and the
observed LCP equals the observed FCP. The 4–5 s figure is Lighthouse's *simulated* LCP: the LCP element
(the H1) was painted only after all fonts and scripts had already finished loading in the unthrottled
trace (`observedLoad` ≤ observed LCP), so the simulator treats **every font file and every script
requested before the paint as part of the LCP critical path** and replays them over slow 4G with a 4×
slower CPU. LCP phases confirm it: TTFB ≈ 0.5 s, resource load delay 0, load time 0, **render delay
4.0–4.8 s**. Shrinking what the root layout downloads and executes before first paint is therefore what
moves the score.

## 2. Fonts

`src/app/layout.tsx` loads five Google font families through `next/font`, all on **every** route:

| Family | Weights | Variable | Where it is actually used |
|---|---|---|---|
| Inter | variable | `--font-inter` | **Site default.** `globals.css` `--font-sans: var(--font-inter)`; live `SiteConfig.globalTheme.fontFamily` = `var(--font-inter)` (checked read-only on the dev branch, a copy of production). |
| Roboto | 400, 500, 700 | `--font-roboto` | Only as a choice in the admin Appearance picker (`src/app/(admin)/admin/(dashboard)/appearance/page.tsx`). Not used by any public page. |
| Poppins | 400, 500, 600, 700 | `--font-poppins` | Admin Appearance picker only. |
| Outfit | variable | `--font-outfit` | Admin Appearance picker only. |
| Playfair Display | variable | `--font-playfair` | Admin Appearance picker only. |

Evidence: Lighthouse network log shows **8 woff2 files, 188 KB** fetched on `/tools/sign`; the build emits
34 woff2 files (800 KB) under `.next/static/media`. `next/font` adds `<link rel="preload">` for each
family's files, so they compete with HTML, CSS and JS for bandwidth before first paint even though only
Inter renders.

## 3. JavaScript in the shared bundle

First-party scripts on `/tools/sign` (uncompressed sizes of the chunks the page loaded; library
attribution by matching library-specific strings in each chunk):

| Size | Contents | Needed on public pages? |
|---|---|---|
| 222 KB | React DOM + Next router runtime | Yes (framework) |
| 144 KB | **framer-motion** | Only for small Navbar/Footer animations. Imported by `src/components/Navbar.tsx` (`motion`, `AnimatePresence`) and `src/components/sections/Footer.tsx` (imported but **unused**: lint warns `'motion' is defined but never used`). 27 files import it overall. |
| 360 KB → 0 | **zod + early-access form** | **Fixed on this branch** (§6): the client form imported constants from a module that imports zod. |
| 108, 53, 43, 27, 27, 22 KB … | Page/route chunks, shared components | Partly |
| 43 + 8 KB | Radix (accordion/tabs/slot) | Partly (product-ui) |
| 36 KB | sonner (toasts) + lucide | `Toaster` is mounted in the root layout on every page; public Sign pages never toast. |

Total first-party script transfer on `/tools/sign`: **336 KB → 246 KB** after §6, in 17 files.

Heavy libraries that are **not** on Sign pages: `three`, `@react-three/fiber`, `@react-three/drei` are
imported only by `src/components/sections/HeroCanvas.tsx` (homepage hero), not by shared chrome. `mermaid`
has no imports in `src/`. `@tiptap` (1 file) and `@dnd-kit` (4 files) are admin-only.

Other client components mounted by the root layout on every page: `ThemeProvider` (sets three CSS
colour variables after mount — does **not** hide or delay content), `SiteContentProvider` (context
only), `CanonicalURL`, `TrackingScripts`, `ConversionWidgets` (WhatsApp/booking widgets and an
exit-intent popup), `Toaster`.

## 4. Google Tag Manager / Analytics

`src/components/TrackingScripts.tsx` (client) injects, in a `useEffect` after hydration:

- `https://www.googletagmanager.com/gtag/js?id=G-NG3CPDVF6F` (GA4, ID hard-coded) — **589 KB**
  uncompressed, the largest script on the page; Lighthouse attributes **685 ms** of main-thread
  blocking to Google Tag Manager on the landing page (third-party summary);
- an inline `gtag('config', …)`;
- GTM container and Microsoft Clarity when `NEXT_PUBLIC_GTM_ID` / `NEXT_PUBLIC_CLARITY_ID` are set.

It is not render-blocking (injected after hydration, `async`), but it is downloaded and executed while
the page is still loading, so it lands inside the simulated LCP window and adds to TBT. It is skipped on
signer links (`isSensitivePath`).

## 5. Is the hero hidden or animated?

**No.** The Sign hero (`src/app/tools/sign/(marketing)/page.tsx`) is plain server-rendered HTML: no
`opacity: 0`, no `framer-motion`, no CSS animation (`globals.css` only defines accordion keyframes). No
wrapper in the root layout gates rendering on mount (`ThemeProvider` and `SiteContentProvider` return
`children` directly). No console errors, so no hydration mismatch forcing a client re-render. The
observed LCP (0.8–1.3 s) equals FCP. (The CMS homepage hero, `HeroCanvas`/framer-motion, is a separate
case and should be measured on its own.)

## 6. Already fixed on this branch (Sign code only)

- The early-access form (client) imported `EARLY_ACCESS_*` constants from `early-access/schema.ts`, which
  imports `zod` → the whole zod library shipped to the browser on every Sign page. Constants moved to the
  zod-free `early-access/constants.ts`; a test now fails if a public Client Component imports `zod` or a
  schema module. **First-party JS −90 KB transfer (−27%)**.
- FAQs use native `<details>` instead of a Radix client accordion (no JS, answers in HTML).
- Site footer accessibility fixes (`role`, list semantics, heading order) → accessibility 100.

## 7. Ranked fixes for the root-layout branch

| # | Fix | Expected impact | Effort / risk |
|---|---|---|---|
| 1 | **Load only the active font.** Keep Inter in the root layout; load Roboto/Poppins/Outfit/Playfair only in the admin Appearance page (or with `preload: false`), or resolve the configured family server-side and load just that one. | −6 font files (~140 KB) from every page's critical path; biggest single lever on simulated LCP (~1–1.5 s on slow 4G). | Low. Check that the CMS theme still applies a non-Inter choice. |
| 2 | **Defer analytics.** Load gtag/GTM/Clarity with `next/script` `strategy="lazyOnload"` (or after first user interaction / idle), and consider `@next/third-parties/google` (already a dependency) for GA. | Removes ~590 KB and ~0.7 s of main-thread work from the load window; TBT −300–700 ms; LCP −0.5–1 s simulated. | Low–medium. Confirm GA page views still record; keep the signer-path exclusion. |
| 3 | **Drop framer-motion from shared chrome.** Replace Navbar/Footer animations with CSS transitions (`transition`, `data-state`), and remove the unused `motion` import in `Footer.tsx`. | −144 KB JS on every page (it stays only where pages really animate). TBT −100–300 ms. | Medium. Visual regression check of the menu open/close. |
| 4 | **Lazy-load non-critical root widgets.** `ConversionWidgets` and `Toaster` via `next/dynamic(..., { ssr: false })` after idle, or mount `Toaster` only in admin/app layouts. | −30–50 KB JS and hydration work on public pages. | Low. |
| 5 | **Reduce root-layout dynamic work.** The root layout calls `getSiteConfig` twice per request (theme + content), making every page dynamic (TTFB ~0.5 s warm, ~6 s on a cold Neon start). Cache the site config (`unstable_cache`/tag revalidation) so marketing pages can be static or ISR. | TTFB −0.3–0.5 s warm and removes cold-start outliers; enables static Sign/legal pages. | Medium. Needs cache invalidation when the theme changes in admin. |
| 6 | **Trim the inline theme `<style>`** generated per request in `layout.tsx` (large CSS string with `!important` overrides) into a static stylesheet plus CSS variables. | Smaller HTML, less style recalculation; minor. | Low–medium. |

Expected result of 1–4 together: simulated LCP ≈ 2–2.5 s and Performance ≥ 90 on `/tools/sign` and
`/tools/sign/pricing` (to be confirmed by measurement on the follow-up branch). Re-measure with the same
Lighthouse settings and report simulated **and** observed LCP.
