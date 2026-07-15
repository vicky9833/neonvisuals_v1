import type { Metadata } from "next";
import { buildMetadata } from "@/lib/utils/seo";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "How Neon Visuals collects, uses, and protects your information across our personalized gifting experiences.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-serif text-4xl text-navy">Privacy Policy</h1>
      <p className="mt-6 text-lg text-[#6B7280]">
        We&apos;re putting the finishing touches on our privacy policy. Full
        details on how we handle your information are coming soon. In the
        meantime, reach out any time and we&apos;ll gladly answer your questions.
      </p>
    </div>
  );
}
