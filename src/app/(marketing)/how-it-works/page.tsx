import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { buildMetadata } from "@/lib/utils/seo";

export const metadata: Metadata = buildMetadata({
  title: "How It Works",
  description:
    "From brief to mockup to production to a camera-ready unboxing - see how Neon Visuals turns a gift into a memory.",
  path: "/how-it-works",
});

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <PageHeader
        title="How it works"
        description="Brief, design, approve, produce, QA, photo proof, deliver."
      />
    </div>
  );
}
