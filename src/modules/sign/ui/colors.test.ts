import { describe, expect, it } from "vitest";
import { FIXED_PAIRS, SITE_BACKGROUNDS, TONES, blend, contrastRatio, toneContrast, type Tone } from "./colors";
import { tailwindHex } from "./test-support/tailwind-colors";

const AA_TEXT = 4.5;

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
