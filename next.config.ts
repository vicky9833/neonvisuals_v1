import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // Surface type errors during builds — do not hide them.
    ignoreBuildErrors: false,
  },
  // Note: Next.js 16 removed ESLint from `next build`. Linting runs
  // separately via the `lint` script (eslint CLI).
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "xserhblhiwtmaiejbvgo.supabase.co",
        pathname: "/storage/v1/object/public/product-images/**",
      },
    ],
  },
};

export default nextConfig;
