import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AnnouncementBar } from "@/components/shared/announcement-bar";
import { MobileNav, type NavLink } from "@/components/shared/mobile-nav";
import { SearchOverlay } from "@/components/search/search-overlay";
import { CollectionIcon } from "@/components/collections/collection-icon";
import { HeaderAuth } from "@/components/auth/HeaderAuth";
import { KitLink } from "@/components/shared/KitLink";
import { NavLinks } from "@/components/shared/nav-links";
import { BUCKETS } from "@/data/buckets";

const NAV_LINKS: NavLink[] = [
  { label: "Occasions", href: "/occasions" },
  { label: "Collections", href: "/collections" },
  { label: "Products", href: "/products" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Blog", href: "/blog" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#F0EDE8] bg-background/85 backdrop-blur-md">
      <AnnouncementBar />
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        {/* Mobile: icon only (28px). Desktop: full lockup (32px icon + wordmark). */}
        <span className="inline-flex md:hidden">
          <Logo variant="icon" theme="dark" iconSize={28} />
        </span>
        <span className="hidden md:inline-flex">
          <Logo variant="horizontal" theme="dark" iconSize={32} />
        </span>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/occasions"
            className="relative text-sm font-medium text-[#555555] transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-gold after:transition-all after:duration-300 hover:text-navy hover:after:w-full"
          >
            Occasions
          </Link>

          {/* Collections mega-dropdown (CSS hover, no JS) */}
          <div className="group relative">
            <Link
              href="/collections"
              className="flex items-center gap-1 text-sm font-medium text-[#555555] transition-colors group-hover:text-navy"
            >
              Collections
              <ChevronDown className="size-4 transition-transform group-hover:rotate-180" />
            </Link>
            <div className="invisible absolute left-1/2 top-full z-50 w-[640px] -translate-x-1/2 pt-4 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
              <div className="grid grid-cols-2 gap-1 rounded-2xl border border-[#EDE9E3] bg-white p-3 shadow-xl">
                {BUCKETS.map((b) => (
                  <Link
                    key={b.code}
                    href={`/collections/${b.slug}`}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-navy">
                      <CollectionIcon name={b.icon} className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[#1A1A1A]">
                        {b.name}
                      </span>
                      <span className="block truncate text-xs text-[#888888]">
                        {b.purpose}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <NavLinks
            links={NAV_LINKS.filter(
              (l) => l.href !== "/occasions" && l.href !== "/collections",
            )}
          />
        </nav>

        <div className="flex items-center gap-2">
          <SearchOverlay />
          <KitLink />
          <HeaderAuth />
          <MobileNav links={NAV_LINKS} />
        </div>
      </div>
    </header>
  );
}
