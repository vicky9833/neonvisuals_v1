import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  COMPANY_NAME,
  INSTAGRAM_URL,
  LINKEDIN_URL,
  SUPPORT_EMAIL,
  TAGLINE,
} from "@/lib/utils/constants";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-numbers",
  display: "swap",
});

const SITE_URL = "https://neonvisuals.in";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `Neon Visuals - ${TAGLINE} | Premium Corporate Gifting India`,
    template: "%s | Neon Visuals",
  },
  description:
    "Premium personalised corporate gifts for corporates, startups, colleges, events, and institutions across India. Every gift carries the recipient's name. Onboarding kits, milestone awards, festive gifts, client appreciation - 120+ products across 11 collections. Enquire now.",
  keywords: [
    "corporate gifting bangalore",
    "personalised corporate gifts",
    "employee onboarding kit",
    "corporate gifts india",
    "premium corporate gifts",
    "diwali corporate gifts",
    "work anniversary gifts",
    "neon visuals",
    "employee recognition gifts",
    "custom corporate gifts bangalore",
  ],
  authors: [{ name: "Neon Visuals", url: SITE_URL }],
  creator: "Neon Visuals",
  publisher: "Neon Visuals",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "./",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "Neon Visuals",
    title: `Neon Visuals - ${TAGLINE} | Premium Corporate Gifting`,
    description:
      "Premium personalised corporate gifts for corporates, startups, colleges, events, and institutions across India. 120+ products, 11 collections. Every gift carries the recipient's name.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Neon Visuals - Premium Corporate Gifting India",
    description:
      "Personalised corporate gifts that stay on desks for years, for corporates, startups, colleges, events, and institutions across India. 120+ products across 11 collections.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1A1A2E",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: COMPANY_NAME,
  alternateName: `${COMPANY_NAME} - ${TAGLINE}`,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    "Premium personalised corporate gifting studio serving corporates, startups, colleges, events, and institutions across India, based in Bengaluru & Mumbai.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Bangalore",
    addressRegion: "Karnataka",
    addressCountry: "IN",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+91-9019409590",
    contactType: "sales",
    email: SUPPORT_EMAIL,
    availableLanguage: ["English", "Hindi", "Kannada"],
  },
  sameAs: [INSTAGRAM_URL, LINKEDIN_URL],
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: COMPANY_NAME,
  description:
    "Premium corporate gifting studio specialising in personalised employee experience gifts.",
  url: SITE_URL,
  telephone: "+91-9019409590",
  email: SUPPORT_EMAIL,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Bangalore",
    addressRegion: "Karnataka",
    postalCode: "560001",
    addressCountry: "IN",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: "12.9716",
    longitude: "77.5946",
  },
  priceRange: "₹₹₹",
  openingHours: "Mo-Sa 09:00-18:00",
  areaServed: { "@type": "City", name: "Bangalore" },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: COMPANY_NAME,
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/products?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${spaceGrotesk.variable} h-full`}
    >
      <body className="font-body min-h-full flex flex-col antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              organizationJsonLd,
              localBusinessJsonLd,
              websiteJsonLd,
            ]),
          }}
        />
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
