import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import {
  ADDRESSES,
  BUSINESS_HOURS,
  COPYRIGHT_YEAR,
  INSTAGRAM_URL,
  LEGACY_EMAIL,
  LINKEDIN_URL,
  PHONE,
  PHONE_2,
  PHONE_3,
  SUPPORT_EMAIL,
  TAGLINE,
  WHATSAPP_URL,
} from "@/lib/utils/constants";
import { BUCKETS } from "@/data/buckets";

type IconProps = { className?: string };

function LinkedinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function InstagramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 3.68a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.84-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z" />
    </svg>
  );
}

// P-fixpass #8: the X/Twitter entry was a dead https://twitter.com placeholder — removed until a
// real handle is available. LinkedIn now points at the company page (see LINKEDIN_URL constant).
const SOCIALS = [
  { label: "LinkedIn", href: LINKEDIN_URL, Icon: LinkedinIcon },
  { label: "Instagram", href: INSTAGRAM_URL, Icon: InstagramIcon },
  { label: "WhatsApp", href: WHATSAPP_URL, Icon: MessageCircle },
];

const QUICK_LINKS = [
  { label: "Occasions", href: "/occasions" },
  { label: "Collections", href: "/collections" },
  { label: "Products", href: "/products" },
  { label: "Curate Your Kit", href: "/gift-builder" },
  { label: "About Us", href: "/about" },
  { label: "Blog", href: "/blog" },
];

const RESOURCE_LINKS = [
  { label: "How It Works", href: "/how-it-works" },
  { label: "Request a Quote", href: "/get-quote" },
  { label: "Contact Us", href: "/contact" },
  { label: "FAQ", href: "/faq" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms & Conditions", href: "/terms" },
];

const CATALOGUE_URL = `${WHATSAPP_URL}?text=Hi%2C%20please%20share%20the%20Neon%20Visuals%20catalogue.`;

export function Footer() {
  return (
    <footer className="mt-auto bg-navy text-cream">
      <div className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand + social */}
          <div className="space-y-5">
            <Logo variant="horizontal" theme="light" iconSize={40} />
            <p className="text-sm font-medium text-gold">{TAGLINE}</p>
            <p className="max-w-xs text-sm text-cream/70">
              Premium personalized gifting experiences for corporates, colleges,
              events, startups, and institutions across India.
            </p>
            <div className="flex items-center gap-3">
              {SOCIALS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex size-9 items-center justify-center rounded-full border border-cream/20 text-cream/80 transition-colors hover:border-gold hover:text-gold"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-cream">Quick Links</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-cream/70 transition-colors hover:text-gold"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-cream">Resources</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {RESOURCE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-cream/70 transition-colors hover:text-gold"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Collections */}
          <div>
            <h3 className="text-sm font-semibold text-cream">Collections</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {BUCKETS.map((b) => (
                <li key={b.code}>
                  <Link
                    href={`/collections/${b.slug}`}
                    className="text-cream/70 transition-colors hover:text-gold"
                  >
                    {b.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Get Gift Ideas */}
          <div>
            <h3 className="text-sm font-semibold text-cream">Get Gift Ideas</h3>
            <p className="mt-4 text-sm text-cream/70">
              Inspiration and ideas for memorable gifting experiences.
            </p>
            <form className="mt-4 flex items-center gap-2">
              <input
                type="email"
                required
                placeholder="Your email"
                aria-label="Email address"
                className="h-11 w-full rounded-lg border border-[#333333] bg-[#1A1A2E] px-4 text-sm text-white placeholder:text-[#666666] focus-visible:border-gold focus-visible:outline-none"
              />
              <Link
                href="/contact"
                className="flex h-11 shrink-0 items-center rounded-lg bg-gold px-4 text-sm font-semibold text-navy transition-colors hover:bg-gold/90"
              >
                Join
              </Link>
            </form>
            <a
              href={CATALOGUE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm font-semibold text-gold transition-colors hover:text-gold/80"
            >
              Download Catalogue
            </a>
          </div>
        </div>

        {/* Contact strip */}
        <div className="mt-14 grid gap-6 border-t border-cream/15 pt-8 text-sm text-cream/70 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-cream">
              <Phone className="size-4 text-gold" aria-hidden="true" />
              Call us
            </div>
            <div className="flex flex-col gap-1">
              {[PHONE, PHONE_2, PHONE_3].map((phone) => (
                <a
                  key={phone}
                  href={`tel:${phone.replace(/\s+/g, "")}`}
                  className="transition-colors hover:text-gold"
                >
                  {phone}
                </a>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-cream">
              <Mail className="size-4 text-gold" aria-hidden="true" />
              Email us
            </div>
            <div className="flex flex-col gap-1">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="transition-colors hover:text-gold">
                {SUPPORT_EMAIL}
              </a>
              <a href={`mailto:${LEGACY_EMAIL}`} className="transition-colors hover:text-gold">
                {LEGACY_EMAIL}
              </a>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-cream">
              <Clock className="size-4 text-gold" aria-hidden="true" />
              Hours
            </div>
            <p>{BUSINESS_HOURS}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-cream">
              <MapPin className="size-4 text-gold" aria-hidden="true" />
              Studios
            </div>
            <p>{ADDRESSES.join(" · ")}</p>
          </div>
        </div>

        {/* Brand statement */}
        <p className="mt-12 text-center text-lg italic text-gold">
          We don&apos;t just personalize gifts. We personalize how people feel.
        </p>

        {/* Copyright bar */}
        <div className="mt-12 flex flex-col gap-2 border-t border-cream/15 pt-6 text-sm text-cream/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {COPYRIGHT_YEAR} NEON VISUALS. All rights reserved. · Handcrafted in
            India.
          </p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-gold">
            {SUPPORT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  );
}
