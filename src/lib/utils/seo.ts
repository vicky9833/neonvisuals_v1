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

/** Article (BlogPosting) JSON-LD for blog post pages. */
export function articleJsonLd(args: {
  title: string;
  description: string;
  slug: string;
  image?: string;
  datePublished?: string | null;
  dateModified?: string | null;
  authorName?: string;
  keywords?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: args.title,
    description: args.description,
    image: args.image ? [args.image] : undefined,
    datePublished: args.datePublished ?? undefined,
    dateModified: args.dateModified ?? args.datePublished ?? undefined,
    keywords: args.keywords?.join(", "),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${args.slug}`,
    },
    author: {
      "@type": "Organization",
      name: args.authorName ?? "Neon Visuals",
    },
    publisher: {
      "@type": "Organization",
      name: "Neon Visuals",
      url: SITE_URL,
    },
  };
}

/** Blog (collection) JSON-LD for the listing page. */
export function blogJsonLd(
  posts: { title: string; slug: string; excerpt: string; datePublished?: string | null }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "The Neon Visuals Journal",
    url: `${SITE_URL}/blog`,
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.excerpt,
      url: `${SITE_URL}/blog/${p.slug}`,
      datePublished: p.datePublished ?? undefined,
    })),
  };
}
