import { describe, expect, it } from "vitest";
import { contrastRatio } from "./colors";
import { SIGNER_COLORS, signerColor } from "./signer-colors";
import { tailwindHex } from "./test-support/tailwind-colors";

describe("signer colours on the white document page", () => {
  it("has ten distinct hues", () => {
    expect(SIGNER_COLORS).toHaveLength(10);
    expect(new Set(SIGNER_COLORS.map((c) => c.hue)).size).toBe(10);
  });

  it.each(SIGNER_COLORS.map((c) => [c.hue, c] as const))("%s: text ≥ 4.5:1 on its tint, border ≥ 3:1 on white", (_hue, color) => {
    const text = tailwindHex(`${color.hue}-900`);
    const tint = tailwindHex(`${color.hue}-${color.tintShade}`);
    const border = tailwindHex(`${color.hue}-700`);
    expect(contrastRatio(text, tint)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(border, "#FFFFFF")).toBeGreaterThanOrEqual(3);
    expect(color.classes).toBe(`border-${color.hue}-700 bg-${color.hue}-${color.tintShade} text-${color.hue}-900`);
  });

  it("lists every generated class literally so Tailwind emits it", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(new URL("./signer-colors.ts", import.meta.url), "utf8");
    for (const c of SIGNER_COLORS) {
      for (const cls of [...c.classes.split(" "), c.swatch]) expect(source, cls).toContain(cls);
    }
  });

  it("wraps after ten signers", () => {
    expect(signerColor(10)).toBe(SIGNER_COLORS[0]);
    expect(signerColor(3)).toBe(SIGNER_COLORS[3]);
  });
});
