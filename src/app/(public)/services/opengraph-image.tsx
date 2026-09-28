import { ImageResponse } from "next/og";
import { OG_SIZE, ogFrame } from "@/lib/og-frame";

export const alt = "Karmakoders software services";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    ogFrame("Web, mobile, SaaS, and AI — scoped in USD.", "Custom software for founders who cannot afford a miss."),
    { ...size }
  );
}
