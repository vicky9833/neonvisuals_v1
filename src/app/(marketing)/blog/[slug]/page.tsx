import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/utils/seo";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  return buildMetadata({
    title: slug.replace(/-/g, " "),
    description: "A Neon Visuals article on employee experience and gifting.",
    path: `/blog/${slug}`,
  });
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const jsonLd = breadcrumbJsonLd([
    { name: "Blog", url: "/blog" },
    { name: slug.replace(/-/g, " "), url: `/blog/${slug}` },
  ]);

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHeader title={slug.replace(/-/g, " ")} description="Coming soon." />
    </article>
  );
}
