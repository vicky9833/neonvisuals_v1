import type { Metadata } from "next";
import { buildMetadata } from "@/lib/utils/seo";

export const metadata: Metadata = buildMetadata({
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about Neon Visuals' personalized corporate gifting experiences.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-serif text-4xl text-navy">Frequently Asked Questions</h1>
      <p className="mt-6 text-lg text-[#6B7280]">
        We&apos;re gathering the questions we hear most and thoughtful answers to
        match. Our FAQ is coming soon. Until then, reach out and we&apos;ll help
        you find exactly what you need.
      </p>
    </div>
  );
}
