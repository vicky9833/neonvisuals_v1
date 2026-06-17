import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { COMPANY_NAME, SUPPORT_EMAIL, TAGLINE } from "@/lib/utils/constants";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://neonvisuals.in"),
  title: {
    default:
      "Neon Visuals — Where Creativity Sparks | Premium Corporate Gifting",
    template: "%s | Neon Visuals",
  },
  description:
    "Premium personalised corporate gifting and employee experience platform. Name-first personalisation, handcrafted packaging, and memorable unboxing experiences. Trusted by 50+ Bangalore startups.",
  keywords: [
    "corporate gifting",
    "employee experience platform",
    "personalised gifts",
    "onboarding kits",
    "work anniversary gifts",
    "corporate gifting Bangalore",
    "Diwali corporate gifts",
  ],
  authors: [{ name: "Neon Visuals" }],
  creator: "Neon Visuals",
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Neon Visuals",
    title:
      "Neon Visuals — Where Creativity Sparks | Premium Corporate Gifting",
    description:
      "Premium personalised corporate gifting and employee experience platform. Name-first personalisation, handcrafted packaging, and memorable unboxing experiences.",
    url: "https://neonvisuals.in",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Neon Visuals — Where Creativity Sparks | Premium Corporate Gifting",
    description:
      "Premium personalised corporate gifting and employee experience platform.",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: COMPANY_NAME,
  url: "https://neonvisuals.in",
  logo: "https://neonvisuals.in/logo.png",
  description: `${COMPANY_NAME} — ${TAGLINE}. Premium personalised corporate gifting and employee experience platform.`,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Bangalore",
    addressRegion: "Karnataka",
    addressCountry: "IN",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    telephone: "+919019409590",
    email: SUPPORT_EMAIL,
    areaServed: "IN",
    availableLanguage: ["en"],
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
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
