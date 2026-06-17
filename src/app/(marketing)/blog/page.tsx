import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { buildMetadata } from "@/lib/utils/seo";

export const metadata: Metadata = buildMetadata({
  title: "Blog",
  description:
    "Ideas on employee experience, recognition, and premium corporate gifting from the Neon Visuals studio.",
  path: "/blog",
});

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <PageHeader
        title="The studio journal"
        description="Notes on recognition, craft, and employee experience."
      />
      <div className="mt-10">
        <EmptyState title="No posts yet" description="New writing is on the way." />
      </div>
    </div>
  );
}
