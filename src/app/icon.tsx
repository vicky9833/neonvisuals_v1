import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1A1A2E",
          color: "#C4A35A",
          fontSize: 18,
          fontWeight: 800,
          borderRadius: 6,
          fontFamily: "sans-serif",
        }}
      >
        NV
      </div>
    ),
    { ...size },
  );
}
