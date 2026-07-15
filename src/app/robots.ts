import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/ops/",
          "/api/",
          "/auth/",
          "/onboarding",
          "/login",
          "/register",
          "/forgot-password",
          "/verify",
          "/payment-status",
        ],
      },
    ],
    sitemap: "https://neonvisuals.in/sitemap.xml",
    host: "https://neonvisuals.in",
  };
}
