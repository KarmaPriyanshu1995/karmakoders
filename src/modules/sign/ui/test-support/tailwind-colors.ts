import fs from "fs";
import path from "path";

/** Test helper: oklch(L% C H) → sRGB hex, as browsers render Tailwind v4 colours. */
export function oklchToHex(l: number, c: number, h: number): string {
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

/** Hex of a Tailwind theme colour such as "blue-500", read from node_modules/tailwindcss/theme.css. */
export function tailwindHex(name: string): string {
  const css = fs.readFileSync(path.resolve(__dirname, "../../../../../node_modules/tailwindcss/theme.css"), "utf8");
  const match = new RegExp(`--color-${name}:\\s*oklch\\(([\\d.]+)% ([\\d.]+) ([\\d.]+)\\)`).exec(css);
  if (!match) throw new Error(`--color-${name} not found in tailwindcss/theme.css`);
  return oklchToHex(Number(match[1]), Number(match[2]), Number(match[3]));
}
