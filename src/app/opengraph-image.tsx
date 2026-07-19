import { ImageResponse } from "next/og";

export const alt = "karmakoders – Premium AI Business Portfolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          backgroundColor: "#252422",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 800,
            color: "#FFFFFF",
            letterSpacing: "-0.02em",
          }}
        >
          karma<span style={{ color: "#FFC300" }}>koders</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 36,
            color: "#A39F97",
            maxWidth: 900,
          }}
        >
          Premium AI-powered web platforms & product engineering
        </div>
      </div>
    ),
    { ...size }
  );
}
