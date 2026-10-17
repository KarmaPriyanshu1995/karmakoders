/**
 * Signer colours for field placement on the white document page (upload flow). Each signer gets
 * a border, a light tint and dark text, and every placed field also shows the signer's initials,
 * so colour is never the only indicator. signer-colors.test.ts checks, against Tailwind's theme,
 * that the text is ≥ 4.5 : 1 on its tint and the border ≥ 3 : 1 on the white page.
 */

export type SignerColor = {
  /** Tailwind hue, e.g. "blue". */
  hue: string;
  /** Field chip classes on the white page: border-{hue}-700 bg-{hue}-{tint} text-{hue}-900. */
  classes: string;
  /** Legend swatch class. */
  swatch: string;
  tintShade: 50 | 100;
};

function color(hue: string, tintShade: 50 | 100 = 50): SignerColor {
  return {
    hue,
    tintShade,
    classes: `border-${hue}-700 bg-${hue}-${tintShade} text-${hue}-900`,
    swatch: `bg-${hue}-700`,
  };
}

/**
 * Written out in full below as well, because Tailwind only generates classes it can see
 * literally in source: border-blue-700 bg-blue-50 text-blue-900 bg-blue-700
 * border-emerald-700 bg-emerald-50 text-emerald-900 bg-emerald-700
 * border-violet-700 bg-violet-50 text-violet-900 bg-violet-700
 * border-rose-700 bg-rose-50 text-rose-900 bg-rose-700
 * border-amber-700 bg-amber-50 text-amber-900 bg-amber-700
 * border-cyan-700 bg-cyan-50 text-cyan-900 bg-cyan-700
 * border-fuchsia-700 bg-fuchsia-50 text-fuchsia-900 bg-fuchsia-700
 * border-lime-700 bg-lime-50 text-lime-900 bg-lime-700
 * border-orange-700 bg-orange-50 text-orange-900 bg-orange-700
 * border-stone-700 bg-stone-100 text-stone-900 bg-stone-700
 */
export const SIGNER_COLORS: readonly SignerColor[] = [
  color("blue"),
  color("emerald"),
  color("violet"),
  color("rose"),
  color("amber"),
  color("cyan"),
  color("fuchsia"),
  color("lime"),
  color("orange"),
  color("stone", 100),
];

/** Colour for the signer at `index` (0-based); wraps after ten. */
export function signerColor(index: number): SignerColor {
  const n = SIGNER_COLORS.length;
  return SIGNER_COLORS[((index % n) + n) % n];
}
