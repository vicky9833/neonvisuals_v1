"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthProfile } from "@/lib/use-auth-profile";

interface ProtectedContentProps {
  children: ReactNode;
  /** Where to send unauthenticated users. Defaults to /login. */
  redirectTo?: string;
  fallback?: ReactNode;
}

/**
 * Client-side guard for interactive sections. Route-level authorization is
 * enforced by the proxy (default-deny allowlist) + authorize(); this is a
 * defence-in-depth helper that only checks for an authenticated session.
 * Role/capability gating is NOT done here (it lives in the two-plane matrix).
 */
export function ProtectedContent({
  children,
  redirectTo = "/login",
  fallback,
}: ProtectedContentProps) {
  const router = useRouter();
  const { loading, profile } = useAuthProfile();

  useEffect(() => {
    if (loading) return;
    if (!profile) router.replace(redirectTo);
  }, [loading, profile, redirectTo, router]);

  if (loading || !profile) {
    return (
      fallback ?? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-[#9CA3AF]" />
        </div>
      )
    );
  }

  return <>{children}</>;
}
