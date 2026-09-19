import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/actions";

export const alt = "KarmaKoders article";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  const title = post?.title || "KarmaKoders";
  const author = post?.author || "KarmaKoders Team";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#09090b",
          padding: "72px",
          color: "#f4f4f5",
        }}
      >
        <div style={{ fontSize: 28, color: "#818cf8", fontWeight: 700, letterSpacing: 4, textTransform: "uppercase" }}>
          KARMAKODERS
        </div>
        <div style={{ fontSize: title.length > 70 ? 48 : 64, fontWeight: 800, lineHeight: 1.15, maxWidth: 1000 }}>
          {title}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#a1a1aa" }}>
          <span>{author}</span>
          <span>karmakoders.com</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
