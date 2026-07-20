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
    <div className="hidden items-center gap-4 md:flex">
      {/* Secondary outlined pill for existing clients — sits left of the primary CTA. */}
      <Link
        href="/login"
        className="inline-flex h-10 items-center rounded-full border border-gold/60 px-5 text-[13px] font-semibold text-navy transition-colors hover:border-gold hover:bg-gold/10"
      >
        Login
      </Link>
      <Link
        href="/contact"
        className="inline-flex h-10 items-center rounded-full bg-navy px-6 text-[13px] font-semibold text-white transition-colors hover:bg-navy/90"
      >
        Get in Touch
      </Link>
    </div>
  );
}
