"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavLinkItem {
  label: string;
  href: string;
}

/**
 * Desktop text nav links with active-route highlighting. The link matching the
 * current pathname (exact or as a section prefix) is rendered in gold with a
 * persistent gold underline; inactive links sit in charcoal and reveal the
 * underline on hover.
 */
export function NavLinks({ links }: { links: NavLinkItem[] }) {
  const pathname = usePathname();

  return (
    <>
      {links.map((link) => {
        const isActive =
          pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={`relative text-sm font-medium transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:bg-gold after:transition-all after:duration-300 hover:after:w-full ${
              isActive
                ? "text-[#C4A35A] after:w-full"
                : "text-[#333333] after:w-0 hover:text-navy"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
