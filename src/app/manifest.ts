import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Neon Visuals — Where Creativity Sparks",
    short_name: "Neon Visuals",
    description: "Premium personalised corporate gifting for Bangalore startups.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAFAF8",
    theme_color: "#1A1A2E",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
  };
}
