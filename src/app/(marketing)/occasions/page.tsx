import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  GraduationCap,
  Handshake,
  type LucideIcon,
  PartyPopper,
} from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { OccasionIcon } from "@/components/shared/occasion-icon";
import { getOccasionBySlug } from "@/data/occasions";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/utils/seo";

export const metadata: Metadata = buildMetadata({
  title: "Corporate Gifting Occasions | Employee, Client & Event Gifts",
  description:
    "Personalised gifting for every occasion - across the employee lifecycle, business relationships, festivals, and education & events. Onboarding, anniversaries, client appreciation, Diwali, college fests, conferences and more.",
  path: "/occasions",
});

const jsonLd = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "Occasions", url: "/occasions" },
]);

/**
 * A card within an occasion section.
 * - `occasionSlug` reuses an existing OCCASIONS entry (icon, description) and
 *   links to its real detail page at `/occasions/${slug}`.
 * - When there is no matching detail page, `icon` + `description` are used and
 *   the card links to `/contact?occasion=` so the form can pre-select.
 */
interface SectionCard {
  label: string;
  occasionSlug?: string;
  icon?: string;
  description?: string;
  tags: string[];
}

interface OccasionSection {
  label: string;
  Icon: LucideIcon;
  cards: SectionCard[];
}

const SECTIONS: OccasionSection[] = [
  {
    label: "Employee Lifecycle",
    Icon: Building2,
    cards: [
      {
        label: "Employee Onboarding",
        occasionSlug: "onboarding-gifts",
        tags: ["Name Engraving", "Embroidery", "Custom Packaging"],
      },
      {
        label: "Work Anniversary",
        occasionSlug: "work-anniversary-gifts",
        tags: ["Laser Engraving", "Name Engraving"],
      },
      {
        label: "Spot Awards",
        occasionSlug: "spot-award-gifts",
        tags: ["Laser Engraving", "Name Engraving"],
      },
      {
        label: "CEO Recognition",
        occasionSlug: "ceo-recognition-gifts",
        tags: ["Laser Engraving", "Name Engraving", "Custom Packaging"],
      },
      {
        label: "Farewell",
        occasionSlug: "farewell-retirement-gifts",
        tags: ["Name Engraving", "Custom Packaging"],
      },
      {
        label: "Retirement",
        occasionSlug: "farewell-retirement-gifts",
        tags: ["Laser Engraving", "Name Engraving"],
      },
    ],
  },
  {
    label: "Business Relationships",
    Icon: Handshake,
    cards: [
      {
        label: "Client Appreciation",
        occasionSlug: "client-appreciation-gifts",
        tags: ["Name Engraving", "UV Printing", "Custom Packaging"],
      },
      {
        label: "Vendor Gifts",
        icon: "Package",
        description:
          "Thank the partners behind your supply chain with pieces that carry their name, not just your logo.",
        tags: ["UV Printing", "Custom Packaging"],
      },
      {
        label: "Investor Gifts",
        icon: "Trophy",
        description:
          "Mark board milestones and funding wins with keepsakes worthy of the people who backed you.",
        tags: ["Laser Engraving", "Custom Packaging"],
      },
      {
        label: "Partner Gifts",
        icon: "Users",
        description:
          "Celebrate the alliances that move your business forward with gifts made for each partner.",
        tags: ["Name Engraving", "Custom Packaging"],
      },
      {
        label: "Speaker Gifts",
        icon: "Award",
        description:
          "Send speakers home with a personalised token that outlasts the applause.",
        tags: ["Laser Engraving", "Name Engraving"],
      },
    ],
  },
  {
    label: "Festivals",
    Icon: PartyPopper,
    cards: [
      {
        label: "Diwali",
        occasionSlug: "diwali-corporate-gifts",
        tags: ["Name Engraving", "UV Printing", "Custom Packaging"],
      },
      {
        label: "Christmas",
        icon: "Gift",
        description:
          "Wrap the season in warmth with individually named gifts your team unwraps, not just receives.",
        tags: ["UV Printing", "Custom Packaging"],
      },
      {
        label: "New Year",
        icon: "Sparkles",
        description:
          "Open the year with an intentional gesture that sets the tone for what's ahead.",
        tags: ["UV Printing", "Custom Packaging"],
      },
      {
        label: "Women's Day",
        icon: "Heart",
        description:
          "Honour the women on your team with thoughtful, personalised pieces that feel seen.",
        tags: ["Name Engraving", "Custom Packaging"],
      },
      {
        label: "Independence Day",
        icon: "Star",
        description:
          "Celebrate the tricolour spirit with premium, personalised gifting for your whole team.",
        tags: ["UV Printing", "Custom Packaging"],
      },
      {
        label: "Holi",
        icon: "Palette",
        description:
          "Bring colour to the workplace with vibrant, personalised gifts made for the festival.",
        tags: ["UV Printing", "Custom Packaging"],
      },
      {
        label: "Eid",
        icon: "Sparkles",
        description:
          "Extend Eid greetings with elegantly packaged gifts that carry a personal note.",
        tags: ["Name Engraving", "Custom Packaging"],
      },
      {
        label: "Pongal",
        icon: "Sprout",
        description:
          "Celebrate the harvest season with warm, personalised gifting rooted in tradition.",
        tags: ["UV Printing", "Custom Packaging"],
      },
      {
        label: "Onam",
        icon: "Leaf",
        description:
          "Mark the season of Onam with graceful, personalised pieces for every team member.",
        tags: ["UV Printing", "Custom Packaging"],
      },
    ],
  },
  {
    label: "Educational & Events",
    Icon: GraduationCap,
    cards: [
      {
        label: "Freshers",
        icon: "Users",
        description:
          "Welcome new batches with branded kits that make the first week unforgettable.",
        tags: ["Embroidery", "UV Printing"],
      },
      {
        label: "Convocation",
        icon: "BookOpen",
        description:
          "Send graduates into the world with a keepsake engraved for the moment.",
        tags: ["Name Engraving", "Custom Packaging"],
      },
      {
        label: "College Fest",
        icon: "Tent",
        description:
          "Kit out your fest with vibrant, personalised merchandise the campus actually keeps.",
        tags: ["UV Printing", "Embroidery"],
      },
      {
        label: "Faculty Recognition",
        icon: "Award",
        description:
          "Honour teaching excellence with awards engraved for the people who shape minds.",
        tags: ["Laser Engraving", "Name Engraving"],
      },
      {
        label: "Student Clubs",
        icon: "Users",
        description:
          "Give your clubs an identity with custom apparel and merch built around them.",
        tags: ["Embroidery", "UV Printing"],
      },
      {
        label: "Conference Merchandise",
        icon: "Package",
        description:
          "Equip every attendee with branded merchandise designed for the main stage.",
        tags: ["UV Printing", "Embroidery", "Custom Packaging"],
      },
      {
        label: "Delegate Kits",
        icon: "PackageOpen",
        description:
          "Hand delegates a curated kit that makes them feel expected, not processed.",
        tags: ["UV Printing", "Custom Packaging"],
      },
      {
        label: "Event Merchandise",
        icon: "Sparkles",
        description:
          "Turn your event into a keepsake with merch personalised for the occasion.",
        tags: ["UV Printing", "Embroidery"],
      },
    ],
  },
];

function OccasionCard({ card }: { card: SectionCard }) {
  const occasion = card.occasionSlug
    ? getOccasionBySlug(card.occasionSlug)
    : undefined;
  const iconName = occasion?.icon ?? card.icon ?? "Gift";
  const description = occasion?.description ?? card.description ?? "";
  const href = occasion
    ? `/occasions/${occasion.slug}`
    : `/contact?occasion=${encodeURIComponent(card.label)}`;
  const affordance = occasion ? "Explore →" : "Enquire →";

  return (
    <Link href={href} className="group block h-full">
      <article className="flex h-full flex-col rounded-2xl border border-[#EDE9E3] bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
        <span className="flex size-12 items-center justify-center rounded-xl bg-navy text-gold transition-transform duration-200 group-hover:scale-105">
          <OccasionIcon name={iconName} className="size-6" />
        </span>
        <h3 className="mt-5 text-lg font-bold text-[#1A1A1A]">{card.label}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-[#666666]">
          {description}
        </p>
        {card.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#C4A35A] bg-transparent px-2 py-0.5 text-xs text-[#1A1A2E]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-gold transition-transform duration-200 group-hover:translate-x-1">
          {affordance}
        </span>
      </article>
    </Link>
  );
}

export default function OccasionsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="bg-background py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white px-4 py-1.5 text-[13px] font-medium text-navy shadow-sm">
                <span className="text-gold">✦</span> Occasion-First Gifting
              </span>
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[#1A1A1A] sm:text-5xl">
                Every Occasion Deserves a Memorable Gift
              </h1>
              <p className="mt-5 text-lg leading-[1.7] text-[#555555]">
                Whether you&apos;re onboarding employees, organizing a college
                fest, celebrating milestones, hosting conferences, or thanking
                clients - we&apos;ll help you create memorable gifting
                experiences.
              </p>
            </div>
          </Reveal>

          <div className="mt-20 space-y-20">
            {SECTIONS.map((section) => {
              const { Icon } = section;
              return (
                <div key={section.label}>
                  <Reveal>
                    <div className="flex items-center gap-3">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-navy text-gold">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <h2 className="text-2xl font-bold tracking-tight text-[#1A1A1A] sm:text-3xl">
                        {section.label}
                      </h2>
                    </div>
                  </Reveal>

                  <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {section.cards.map((card, i) => (
                      <Reveal key={`${card.label}-${i}`} delay={(i % 3) * 80}>
                        <OccasionCard card={card} />
                      </Reveal>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
