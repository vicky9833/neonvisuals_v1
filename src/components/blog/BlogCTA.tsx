import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WHATSAPP_NUMBER } from "@/lib/utils/constants";
import type { BlogPost } from "@/lib/engines/blog";

interface BlogCTAProps {
  post: Pick<BlogPost, "title" | "cta_type" | "cta_text" | "cta_url">;
}

const DEFAULTS: Record<
  string,
  { label: string; href: string; external?: boolean }
> = {
  enquire: { label: "Talk to a Gifting Expert", href: "/contact" },
  gift_builder: { label: "Build Your Kit", href: "/gift-builder" },
  catalog: { label: "Explore the Collections", href: "/products" },
  whatsapp: {
    label: "Chat on WhatsApp",
    href: `https://wa.me/${WHATSAPP_NUMBER}`,
    external: true,
  },
};

export function BlogCTA({ post }: BlogCTAProps) {
  if (post.cta_type === "none") return null;

  const fallback = DEFAULTS[post.cta_type] ?? DEFAULTS.enquire;
  const label = post.cta_text ?? fallback.label;

  let href = post.cta_url ?? fallback.href;
  let external = fallback.external ?? false;
  if (post.cta_type === "whatsapp" && !post.cta_url) {
    href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      `Hi, I just read "${post.title}" and I'd like to talk about gifting for my team.`,
    )}`;
    external = true;
  }

  return (
    <section className="my-12 rounded-2xl border border-gold/30 bg-secondary/50 p-8 text-center">
      <h2 className="font-heading text-xl font-bold text-navy">
        Ready to make your team feel seen?
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#6B7280]">
        We design premium, personalised gifting experiences for teams across
        India. Let&apos;s build something they&apos;ll remember.
      </p>
      {external ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
        >
          {label} <ArrowRight className="size-4" />
        </a>
      ) : (
        <Link
          href={href}
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
        >
          {label} <ArrowRight className="size-4" />
        </Link>
      )}
    </section>
  );
}
