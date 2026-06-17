import type { Metadata } from "next";

const SITE_URL = "https://neonvisuals.in";

interface BuildMetadataArgs {
  title: string;
  description: string;
  /** Path relative to the site root, e.g. "/products". */
  path?: string;
  image?: string;
  keywords?: string[];
}

/** Builds consistent page Metadata with canonical + Open Graph + Twitter. */
export function buildMetadata({
  title,
  description,
  path = "/",
  image,
  keywords,
}: BuildMetadataArgs): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: "Neon Visuals",
      title,
      description,
      url,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

/** BreadcrumbList JSON-LD for a sequence of pages. */
export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

/** FAQPage JSON-LD from question/answer pairs. */
export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}
