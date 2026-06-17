import type { Config } from "tailwindcss";

/**
 * Tailwind v4 uses CSS-first configuration via `@theme` in globals.css.
 * This file is wired in through the `@config` directive and holds the
 * Neon Visuals brand tokens (colors, fonts, radii, motion) so they are
 * available as utilities (e.g. bg-navy, text-gold, animate-fade-in).
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/emails/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#1A1A2E",
        gold: "#C4A35A",
        cream: "#F5F0E8",
        charcoal: "#2D2D2D",
        warmWhite: "#FAFAF7",
        burgundy: "#7C2D36",
        accentGreen: "#2D6A4F",
      },
      fontFamily: {
        heading: ["var(--font-body)", "Plus Jakarta Sans", "sans-serif"],
        body: ["var(--font-body)", "Plus Jakarta Sans", "sans-serif"],
        numbers: ["var(--font-numbers)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        button: "8px",
        input: "8px",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(196, 163, 90, 0)" },
          "50%": { boxShadow: "0 0 16px 2px rgba(196, 163, 90, 0.45)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 500ms ease-out both",
        "slide-up": "slide-up 400ms ease-out both",
        "scale-in": "scale-in 300ms ease-out both",
        glow: "glow 2.4s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
};

export default config;
