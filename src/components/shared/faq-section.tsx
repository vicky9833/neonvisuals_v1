import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/marketing/reveal";

export interface Faq {
  q: string;
  a: string;
}

/** Canonical FAQ content shared across marketing pages. */
export const FAQS: readonly Faq[] = [
  {
    q: "What is the minimum order quantity?",
    a: "We work with orders starting from just 10 units. Whether you're a startup of 15 or an enterprise of 5,000 - we've got you covered.",
  },
  {
    q: "Can every product be personalized?",
    a: "Yes. Every product can carry the recipient's name, your company logo, and a custom message. We offer laser engraving, UV printing, embroidery, and debossing depending on the material.",
  },
  {
    q: "Do you deliver across India?",
    a: "Absolutely. We deliver PAN India - from metros to tier-2 and tier-3 cities. We've shipped to 100+ cities so far.",
  },
  {
    q: "How long does production take?",
    a: "Standard orders take 7-10 working days after design approval. Rush orders (3-5 days) are available for an additional charge.",
  },
  {
    q: "Can I see mockups before production?",
    a: "Always. We share digital mockups for your approval before anything goes into production. You see exactly what your recipients will receive.",
  },
  {
    q: "Do you handle urgent or last-minute orders?",
    a: "Yes, we offer rush production for time-sensitive occasions like festivals or last-minute events. Just let us know your deadline.",
  },
  {
    q: "Do you provide GST invoices?",
    a: "Yes. All orders come with GST-compliant invoices. We're a registered business (GSTIN: 27BZSPV5411Q1ZA).",
  },
] as const;

interface FaqSectionProps {
  heading?: string;
  /** Emit FAQPage JSON-LD. Disable on pages that already carry the canonical schema. */
  withJsonLd?: boolean;
  className?: string;
}

/**
 * Reusable FAQ accordion built from the shared {@link FAQS} content, matching
 * the homepage styling. Server component - safe to render anywhere.
 */
export function FaqSection({
  heading = "Frequently Asked Questions",
  withJsonLd = true,
  className,
}: FaqSectionProps) {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className={className}>
      {withJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <div className="mx-auto max-w-3xl px-6">
        <Reveal>
          <h2 className="text-center text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-[2.5rem]">
            {heading}
          </h2>
        </Reveal>
        <Reveal className="mt-12">
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq, i) => (
              <AccordionItem
                key={faq.q}
                value={`faq-${i}`}
                className="border-[#EDE9E3]"
              >
                <AccordionTrigger className="text-base font-semibold text-[#1A1A1A] hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-[15px] leading-[1.7] text-[#666666]">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </div>
  );
}
