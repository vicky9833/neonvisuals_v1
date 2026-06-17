import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { buildMetadata } from "@/lib/utils/seo";

export const metadata: Metadata = buildMetadata({
  title: "About",
  description:
    "Neon Visuals is a premium employee experience studio. We design recognition that makes companies look attentive, credible, and emotionally intelligent.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <PageHeader
        title="About Neon Visuals"
        description="A premium recognition studio, not a swag shop. We ship memory with production discipline."
      />
    </div>
  );
}
