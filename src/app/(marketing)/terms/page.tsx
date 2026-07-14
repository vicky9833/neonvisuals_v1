import type { Metadata } from "next";
import { buildMetadata } from "@/lib/utils/seo";

export const metadata: Metadata = buildMetadata({
  title: "Terms & Conditions",
  description:
    "The terms and conditions that govern your use of Neon Visuals' personalized gifting services.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-serif text-4xl text-navy">Terms &amp; Conditions</h1>
      <p className="mt-6 text-lg text-[#6B7280]">
        Our full terms and conditions are being finalized and will be published
        here soon. If you have questions about working with us in the meantime,
        we&apos;re always happy to talk it through.
      </p>
    </div>
  );
}
