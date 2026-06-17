"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Award, Check, Gift, Handshake, Sparkles } from "lucide-react";

const TABS = [
  {
    id: "recognition",
    label: "Employee Recognition",
    icon: Award,
    heading: "Recognition That Feels Personal",
    description:
      "Turn onboarding, anniversaries, and spot awards into moments employees remember — each gift carries their name and a message from leadership.",
    points: [
      "Name-first personalisation on every piece",
      "Automated work-anniversary reminders",
      "Curated kits by tenure and archetype",
      "Photo-proofed before dispatch",
    ],
  },
  {
    id: "client",
    label: "Client Appreciation",
    icon: Handshake,
    heading: "Clients Remember How You Made Them Feel",
    description:
      "Strengthen business relationships with gifts that reflect your brand's taste and values — not a generic experience kit from a catalogue.",
    points: [
      "Custom gift selection based on client profiles",
      "Branded packaging with your company identity",
      "Seasonal and milestone gifting programmes",
      "Handwritten-style personal notes",
    ],
  },
  {
    id: "festival",
    label: "Festival Gifting",
    icon: Sparkles,
    heading: "Festivals Done Right, Finally",
    description:
      "Diwali, Holi, Christmas, Pongal — every festival is a chance to show your team you thought about them specifically, not just ordered in bulk.",
    points: [
      "Curated festival-specific collections",
      "Individual personalisation at scale",
      "Early-bird planning with reminder system",
      "Eco-conscious packaging options",
    ],
  },
];

export function CorporateTabs() {
  const [active, setActive] = useState(0);
  const tab = TABS[active];

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-3">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(i)}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
              i === active
                ? "bg-navy text-white"
                : "border border-[#EDE9E3] bg-white text-[#555555] hover:border-navy/30"
            }`}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-12 grid items-center gap-12 lg:grid-cols-2">
        <div>
          <h3 className="text-2xl font-bold text-[#1A1A1A] sm:text-3xl">
            {tab.heading}
          </h3>
          <p className="mt-4 text-[17px] leading-[1.7] text-[#555555]">
            {tab.description}
          </p>
          <ul className="mt-6 space-y-3">
            {tab.points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[15px] text-[#1A1A1A]">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
                  <Check className="size-3.5" />
                </span>
                {p}
              </li>
            ))}
          </ul>
          <Link
            href="/get-quote"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-navy px-7 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
          >
            Learn More <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-linear-to-br from-navy to-gold shadow-xl">
          <div className="absolute inset-0 flex items-center justify-center">
            <Gift className="size-24 text-white/90" />
          </div>
          <span className="absolute left-6 top-6 size-16 rounded-full border border-white/20" />
          <span className="absolute bottom-8 right-8 size-24 rounded-full border border-white/15" />
        </div>
      </div>
    </div>
  );
}
