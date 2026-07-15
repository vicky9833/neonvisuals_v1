import type { MetadataRoute } from "next";
import { TAGLINE } from "@/lib/utils/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `Neon Visuals - ${TAGLINE}`,
    short_name: "Neon Visuals",
    description:
      "Premium personalised corporate gifting for corporates, startups, colleges, events, and institutions across India.",
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
