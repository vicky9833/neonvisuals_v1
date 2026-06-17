"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/brand/logo";
import { useAuthProfile } from "@/lib/use-auth-profile";
import { signOut } from "@/lib/auth-client";

export interface NavLink {
  label: string;
  href: string;
}

interface MobileNavProps {
  links: NavLink[];
}

function initials(name: string, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function MobileNav({ links }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { loading, profile } = useAuthProfile();
  const authed = !loading && profile;

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle asChild>
            <Logo asLink={false} />
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-1 px-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-button px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/gift-builder"
            onClick={() => setOpen(false)}
            className="mt-2 rounded-button border border-gold/50 bg-gold/10 px-3 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold/20"
          >
            Curate a Kit
          </Link>

          {authed ? (
            <div className="mt-4 border-t border-border pt-4">
              <div className="mb-2 flex items-center gap-3 px-3">
                <Avatar className="size-9 border border-[#EDE9E3]">
                  {profile.avatar_url ? (
                    <AvatarImage
                      src={profile.avatar_url}
                      alt={profile.full_name}
                    />
                  ) : null}
                  <AvatarFallback className="bg-navy text-xs font-semibold text-white">
                    {initials(profile.full_name, profile.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-navy">
                    {profile.full_name}
                  </span>
                  <span className="block truncate text-xs text-[#6B7280]">
                    {profile.email}
                  </span>
                </span>
              </div>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-button px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <LayoutDashboard className="size-4" />
                Dashboard
              </Link>
              <Link
                href="/dashboard/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-button px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <Building2 className="size-4" />
                Company Settings
              </Link>
              {profile.role === "super_admin" ? (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-button px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  <Shield className="size-4" />
                  Admin Panel
                </Link>
              ) : null}
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-button px-3 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="size-4" />
                Sign Out
              </button>
            </div>
          ) : (
            <Button asChild className="mt-4">
              <Link href="/get-quote" onClick={() => setOpen(false)}>
                Get a Quote
              </Link>
            </Button>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
