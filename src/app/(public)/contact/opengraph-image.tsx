import { ImageResponse } from "next/og";
import { OG_SIZE, ogFrame } from "@/lib/og-frame";

export const alt = "Contact Karmakoders";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    ogFrame("Book a 20-minute discovery call.", "NDA first. EST overlap. We reply within 12 hours."),
    { ...size }
  );
}
