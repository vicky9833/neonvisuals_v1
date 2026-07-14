import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Neon Visuals - Premium Corporate Gifting";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#1A1A2E",
          color: "#FAFAF8",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "#C4A35A",
            textTransform: "uppercase",
          }}
        >
          Neon Visuals
        </div>
        <div style={{ fontSize: 32, marginTop: 8, color: "#C4A35A" }}>
          Crafted with Intention. Remembered with Pride.
        </div>
        <div style={{ fontSize: 40, marginTop: 40, fontWeight: 600 }}>
          Premium Corporate Gifting
        </div>
        <div style={{ fontSize: 28, marginTop: 8, color: "#94A3B8" }}>
          Bangalore, India
        </div>
        <div style={{ fontSize: 26, marginTop: 32, color: "#FAFAF8" }}>
          120+ Products · 11 Collections
        </div>
        <div style={{ fontSize: 24, marginTop: 6, color: "#94A3B8" }}>
          Every gift carries the recipient&apos;s name.
        </div>
        <div style={{ fontSize: 24, marginTop: 40, color: "#C4A35A" }}>
          neonvisuals.in
        </div>
      </div>
    ),
    { ...size },
  );
}
