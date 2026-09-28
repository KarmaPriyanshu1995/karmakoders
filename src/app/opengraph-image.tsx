import { ImageResponse } from "next/og";
import { OG_SIZE, ogFrame } from "@/lib/og-frame";

export const alt = "Karmakoders — custom software for US teams";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    ogFrame("Ship the product US buyers already expect.", "Senior engineers. EST overlap. NDA first. USD pricing."),
    { ...size }
  );
}
