import { ImageResponse } from "next/og";
import { OG_SIZE, ogFrame } from "@/lib/og-frame";

export const alt = "Karmakoders pricing";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    ogFrame("USD pricing for scoped software work.", "Starter, Growth, and Enterprise — no surprise retainers."),
    { ...size }
  );
}
