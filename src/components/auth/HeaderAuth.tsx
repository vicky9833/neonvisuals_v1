"use client";

import Link from "next/link";
import { useAuthProfile } from "@/lib/use-auth-profile";
import { UserMenu } from "@/components/auth/UserMenu";

/**
 * Desktop header auth slot. Shows the avatar dropdown when signed in, and the
 * default "Get in Touch" CTA otherwise (including while the session resolves),
 * so unauthenticated visitors see the header exactly as before.
 */
export function HeaderAuth() {
  const { loading, profile } = useAuthProfile();

  if (!loading && profile) {
    return (
      <div className="hidden md:flex">
        <UserMenu profile={profile} />
      </div>
    );
  }

  return (
    <Link
      href="/contact"
      className="hidden h-10 items-center rounded-full bg-navy px-6 text-[13px] font-semibold text-white transition-colors hover:bg-navy/90 md:inline-flex"
    >
      Get in Touch
    </Link>
  );
}
