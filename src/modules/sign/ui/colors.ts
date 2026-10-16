/**
 * Semantic status colours for Sign, using the site's existing pattern
 * (`bg-{c}-500/10 border-{c}-500/20 text-{c}-400`). This is not a token layer: every class here is
 * a stock Tailwind class the marketing site already uses. The hex values mirror Tailwind v4's
 * oklch palette (verified against node_modules/tailwindcss/theme.css in colors.test.ts) and exist
 * only so contrast can be tested and shown in the dev preview.
 */

export const SITE_BACKGROUNDS = {
  main: "#252422",
  secondary: "#1C1B1A",
} as const;

export type Tone = "neutral" | "info" | "warning" | "success" | "danger";

export type ToneColors = {
  /** Badge / chip / alert surface classes (border + tint + text). */
  classes: string;
  /** Icon and accent text colour class. */
  text: string;
  /** Rendered foreground colour (the text class). */
  fg: string;
  /** Rendered tint behind the text (the -500 shade at 10% opacity), or null for neutral. */
  tint: string | null;
  tintAlpha: number;
};

export const TONES: Record<Tone, ToneColors> = {
  neutral: {
    classes: "border-white/15 bg-white/5 text-[#A39F97]",
    text: "text-[#A39F97]",
    fg: "#A39F97",
    tint: "#FFFFFF",
    tintAlpha: 0.05,
  },
  info: {
    classes: "border-blue-500/20 bg-blue-500/10 text-blue-400",
    text: "text-blue-400",
    fg: "#51a2ff",
    tint: "#2b7fff",
    tintAlpha: 0.1,
  },
  warning: {
    classes: "border-amber-500/20 bg-amber-500/10 text-amber-400",
    text: "text-amber-400",
    fg: "#ffb900",
    tint: "#fe9a00",
    tintAlpha: 0.1,
  },
  success: {
    classes: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    text: "text-emerald-400",
    fg: "#00d492",
    tint: "#00bc7d",
    tintAlpha: 0.1,
  },
  danger: {
    classes: "border-rose-500/20 bg-rose-500/10 text-rose-400",
    text: "text-rose-400",
    fg: "#ff637e",
    tint: "#ff2056",
    tintAlpha: 0.1,
  },
};

/** Fixed pairs the components rely on, with their rendered colours. */
export const FIXED_PAIRS = [
  { name: "Primary button (text-[#1C1B1A] on bg-[#FFC300])", fg: "#1C1B1A", bg: "#FFC300" },
  { name: "Danger button (text-white on bg-rose-600)", fg: "#FFFFFF", bg: "#ec003f" },
  { name: "Danger button hover (text-white on bg-rose-700)", fg: "#FFFFFF", bg: "#c70036" },
  { name: "Body text (text-white on #252422)", fg: "#FFFFFF", bg: SITE_BACKGROUNDS.main },
  { name: "Muted text (#A39F97 on #252422)", fg: "#A39F97", bg: SITE_BACKGROUNDS.main },
  { name: "Muted text (#A39F97 on #1C1B1A)", fg: "#A39F97", bg: SITE_BACKGROUNDS.secondary },
  { name: "Accent text (#FFC300 on #252422)", fg: "#FFC300", bg: SITE_BACKGROUNDS.main },
  { name: "Field error (text-rose-300 on #252422)", fg: "#ffa1ad", bg: SITE_BACKGROUNDS.main },
] as const;

type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

/** Alpha-composites `fg` at `alpha` over `bg`. */
export function blend(fg: string, bg: string, alpha: number): string {
  const a = hexToRgb(fg);
  const b = hexToRgb(bg);
  return `#${a.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)).toString(16).padStart(2, "0")).join("")}`;
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio. */
export function contrastRatio(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Contrast of a tone's text on its own tinted surface over a site background. */
export function toneContrast(tone: Tone, background: string): number {
  const { fg, tint, tintAlpha } = TONES[tone];
  const surface = tint ? blend(tint, background, tintAlpha) : background;
  return contrastRatio(fg, surface);
}
