import { ImageResponse } from "next/og";
import { OG_SIZE, ogFrame } from "@/lib/og-frame";

export const alt = "About Karmakoders";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    ogFrame("The people on your thread.", "Founder-led engineering with EST overlap and NDA-first scoping."),
    { ...size }
  );
}
