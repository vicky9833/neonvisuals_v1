import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  Clock,
  SearchX,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { buildMetadata } from "@/lib/utils/seo";

export const metadata: Metadata = buildMetadata({
  title: "How It Works",
  description:
    "From brief to mockup to production to a camera-ready unboxing - see how Neon Visuals turns a gift into a memory.",
  path: "/how-it-works",
});

const INTRO =
  "From brief to doorstep, without the chaos. Corporate gifting usually means a dozen email threads, guesswork on quantities, and hoping it arrives on time. We replaced that with one clear path - you tell us the occasion and the volume, we handle design, approval, production, quality, and delivery, and you see proof photos before anything ships. Here's how it works.";

const STEPS: { n: string; t: string; d: string }[] = [
  { n: "01", t: "Tell us the occasion", d: "Onboarding, anniversaries, festivals, recognition - pick the moment and we'll show you what works." },
  { n: "02", t: "We curate the perfect gift", d: "Matched to your occasion, budget, and team size. No endless scrolling through catalogues." },
  { n: "03", t: "You approve the design", d: "See mockups and personalisation before we make anything. Nothing goes to production without your sign-off." },
  { n: "04", t: "We personalise each one", d: "Names, messages, and packaging - all handled by our personalisation artists, by hand." },
  { n: "05", t: "Quality check", d: "Every gift is inspected and QC'd before dispatch - camera-ready, no surprises." },
  { n: "06", t: "Photo proof before it ships", d: "You get proof photos of the finished gifts before anything leaves our studio." },
  { n: "07", t: "Delivered with intention", d: "PAN-India delivery, tracked and on time, designed for the eight-second opening moment." },
];

const TIME_SAVERS: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: SearchX, title: "No Endless Scrolling", desc: "Skip the catalogue rabbit hole. Tell us the occasion and team size - we shortlist what actually fits." },
  { icon: ClipboardCheck, title: "One Brief, Done", desc: "Share the details once. We handle selection, personalisation, and packaging end to end." },
  { icon: Clock, title: "Hours Back Every Week", desc: "No vendor chasing, no sample chaos. Your gifting runs in the background while you do your job." },
  { icon: Sparkles, title: "Consistently On-Brand", desc: "Every gift looks intentional and premium - without you reviewing a single proof by hand." },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <PageHeader title="How it works" description="Brief, design, approve, produce, QA, photo proof, deliver." />

      <p className="mt-6 max-w-3xl text-base leading-[1.8] text-[#333333]">{INTRO}</p>

      {/* Steps */}
      <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.n} className="group">
            <span className="font-numbers inline-block text-[3rem] font-bold leading-none text-gold">
              {step.n}
            </span>
            <span className="mt-3 mb-4 block h-0.5 w-10 bg-gold" />
            <h3 className="text-base font-bold text-[#1A1A2E]">{step.t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#333333]">{step.d}</p>
          </div>
        ))}
      </div>

      {/* Time-savers */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-[#1A1A2E]">Built to save you time</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TIME_SAVERS.map((item) => (
            <div key={item.title} className="h-full rounded-xl border border-[#EDE9E3] bg-[#F5F0E8] p-6 shadow-sm">
              <span className="flex size-12 items-center justify-center rounded-xl bg-navy text-gold">
                <item.icon className="size-6" />
              </span>
              <h3 className="mt-5 text-lg font-bold text-[#1A1A2E]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#333333]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-14 flex flex-wrap items-center gap-3">
        <Link
          href="/get-quote"
          className="group inline-flex h-12 items-center gap-2 rounded-full bg-[#1A1A2E] px-7 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#2a2a4e]"
        >
          Request a Quote
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
        <Link
          href="/gift-builder"
          className="inline-flex h-12 items-center rounded-full border-2 border-[#C4A35A] px-7 text-sm font-semibold text-[#C4A35A] transition-colors duration-200 hover:bg-[#C4A35A] hover:text-white"
        >
          Curate Your Kit
        </Link>
      </div>
    </div>
  );
}
