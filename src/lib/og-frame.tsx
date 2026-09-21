import type { ReactElement } from "react";

export const OG_SIZE = { width: 1200, height: 630 };

export function ogFrame(title: string, subtitle: string): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        backgroundColor: "#1C1B1A",
        padding: "80px",
      }}
    >
      <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em" }}>
        karma<span style={{ color: "#FFC300" }}>koders</span>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 28,
          fontSize: 56,
          fontWeight: 800,
          color: "#FFFFFF",
          lineHeight: 1.15,
          maxWidth: 980,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", marginTop: 20, fontSize: 28, color: "#A39F97", maxWidth: 900 }}>
        {subtitle}
      </div>
    </div>
  );
}
