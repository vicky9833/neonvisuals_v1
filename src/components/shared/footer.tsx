import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { COMPANY_NAME, SUPPORT_EMAIL, TAGLINE } from "@/lib/utils/constants";
import { BUCKETS } from "@/data/buckets";

type IconProps = { className?: string };

function LinkedInIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function InstagramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.12 1.38C1.35 2.68.93 3.35.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.12.66.66 1.33 1.08 2.12 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.85 5.85 0 0 0 2.12-1.38 5.85 5.85 0 0 0 1.38-2.12c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.85 5.85 0 0 0-1.38-2.12A5.85 5.85 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z" />
    </svg>
  );
}

function XIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.9 1.5h3.68l-8.04 9.19L24 22.5h-7.4l-5.8-7.58-6.63 7.58H.49l8.6-9.83L0 1.5h7.59l5.24 6.93L18.9 1.5zm-1.29 18.79h2.04L6.49 3.6H4.3l13.31 16.69z" />
    </svg>
  );
}

const SOCIALS = [
  { label: "LinkedIn", href: "https://linkedin.com", Icon: LinkedInIcon },
  { label: "Instagram", href: "https://instagram.com", Icon: InstagramIcon },
  { label: "X (Twitter)", href: "https://twitter.com", Icon: XIcon },
];

const QUICK_LINKS = [
  { label: "Occasions", href: "/occasions" },
  { label: "Collections", href: "/collections" },
  { label: "Products", href: "/products" },
  { label: "Gift Builder", href: "/gift-builder" },
  { label: "Corporate Gifting", href: "/pricing" },
  { label: "About Us", href: "/about" },
];

const SUPPORT_LINKS = [
  { label: "How It Works", href: "/how-it-works" },
  { label: "Get a Quote", href: "/get-quote" },
  { label: "Contact Us", href: "/contact" },
  { label: "Blog", href: "/blog" },
  { label: "Sign in", href: "/login" },
];

export function Footer() {
  return (
    <footer className="mt-auto bg-navy text-cream">
      <div className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand + social */}
          <div className="space-y-5">
            <Logo className="text-cream" />
            <p className="max-w-xs text-sm text-cream/70">
              {TAGLINE}. Premium personalised recognition that makes your people
              feel individually seen.
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

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-cream">Support</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {SUPPORT_LINKS.map((link) => (
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

          {/* Subscribe */}
          <div>
            <h3 className="text-sm font-semibold text-cream">Subscribe</h3>
            <p className="mt-4 text-sm text-cream/70">
              Ideas and inspiration for better employee experiences.
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
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-cream/15 pt-6 text-sm text-cream/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {COMPANY_NAME.toUpperCase()}. All rights
            reserved. · Handcrafted in Bangalore.
          </p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-gold">
            {SUPPORT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  );
}
