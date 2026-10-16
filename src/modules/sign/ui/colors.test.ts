import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { FIXED_PAIRS, SITE_BACKGROUNDS, TONES, blend, contrastRatio, toneContrast, type Tone } from "./colors";

const AA_TEXT = 4.5;

/** oklch(L% C H) → sRGB hex, as browsers render Tailwind v4 colours. */
function oklchToHex(l: number, c: number, h: number): string {
  const L = l / 100;
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  return `#${linear
    .map((x) => {
      const v = Math.min(1, Math.max(0, x));
      const srgb = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
      return Math.round(srgb * 255).toString(16).padStart(2, "0");
    })
    .join("")}`;
}

function tailwindHex(name: string): string {
  const css = fs.readFileSync(path.resolve(__dirname, "../../../../node_modules/tailwindcss/theme.css"), "utf8");
  const match = new RegExp(`--color-${name}:\\s*oklch\\(([\\d.]+)% ([\\d.]+) ([\\d.]+)\\)`).exec(css);
  if (!match) throw new Error(`--color-${name} not found in tailwindcss/theme.css`);
  return oklchToHex(Number(match[1]), Number(match[2]), Number(match[3]));
}

const TONE_SHADES: Record<Exclude<Tone, "neutral">, string> = {
  info: "blue",
  warning: "amber",
  success: "emerald",
  danger: "rose",
};

describe("Sign semantic colours", () => {
  it.each(Object.entries(TONE_SHADES))("%s hex values match Tailwind's %s-400 / -500", (tone, colour) => {
    expect(TONES[tone as Tone].fg).toBe(tailwindHex(`${colour}-400`));
    expect(TONES[tone as Tone].tint).toBe(tailwindHex(`${colour}-500`));
    expect(TONES[tone as Tone].classes).toBe(`border-${colour}-500/20 bg-${colour}-500/10 text-${colour}-400`);
  });

  it("fixed pairs use Tailwind's real rose-600 / rose-700 / rose-300", () => {
    const byName = (start: string) => FIXED_PAIRS.find((p) => p.name.startsWith(start))!;
    expect(byName("Danger button (").bg).toBe(tailwindHex("rose-600"));
    expect(byName("Danger button hover").bg).toBe(tailwindHex("rose-700"));
    expect(byName("Field error").fg).toBe(tailwindHex("rose-300"));
  });

  const backgrounds = Object.entries(SITE_BACKGROUNDS);
  const tones = Object.keys(TONES) as Tone[];

  it.each(tones.flatMap((tone) => backgrounds.map(([bgName, bg]) => [tone, bgName, bg] as const)))(
    "%s meets AA on its tinted surface over the %s background",
    (tone, _bgName, bg) => {
      expect(toneContrast(tone, bg)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(TONES[tone].fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  );

  it.each(FIXED_PAIRS.map((pair) => [pair.name, pair] as const))("%s meets AA", (_name, pair) => {
    expect(contrastRatio(pair.fg, pair.bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("Sign input borders (white/35) meet 3:1 non-text contrast; the site's 8% border does not", () => {
    for (const bg of Object.values(SITE_BACKGROUNDS)) {
      const field = blend("#000000", bg, 0.4); // bg-black/40
      expect(contrastRatio(blend("#FFFFFF", field, 0.35), field)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(blend("#FFFFFF", field, 0.08), field)).toBeLessThan(3);
    }
  });

  it("contrastRatio matches known WCAG values", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });
});
