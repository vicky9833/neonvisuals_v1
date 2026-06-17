"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthProfile } from "@/lib/use-auth-profile";
import type { Role } from "@/lib/auth-types";

interface ProtectedContentProps {
  children: ReactNode;
  /** Restrict to one or more roles. Omit to allow any authenticated user. */
  roles?: Role[];
  /** Where to send unauthenticated users. Defaults to /login. */
  redirectTo?: string;
  fallback?: ReactNode;
}

/**
 * Client-side guard for interactive sections. Route-level protection is
 * enforced by the proxy/middleware; this is a defence-in-depth helper for
 * client components that render protected UI.
 */
export function ProtectedContent({
  children,
  roles,
  redirectTo = "/login",
  fallback,
}: ProtectedContentProps) {
  const router = useRouter();
  const { loading, profile } = useAuthProfile();

  const allowed = profile && (!roles || roles.includes(profile.role));

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace(redirectTo);
    } else if (roles && !roles.includes(profile.role)) {
      router.replace("/dashboard");
    }
  }, [loading, profile, roles, redirectTo, router]);

  if (loading || !allowed) {
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
