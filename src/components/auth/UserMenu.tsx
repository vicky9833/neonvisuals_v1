"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, LayoutDashboard, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "@/lib/auth-client";
import type { AuthProfileLite } from "@/lib/use-auth-profile";

function initials(name: string, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/** Authenticated avatar dropdown shown in the header. */
export function UserMenu({ profile }: { profile: AuthProfileLite }) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-gold"
        aria-label="Open account menu"
      >
        <Avatar className="size-9 border border-[#EDE9E3]">
          {profile.avatar_url ? (
            <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
          ) : null}
          <AvatarFallback className="bg-navy text-xs font-semibold text-white">
            {initials(profile.full_name, profile.email)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate font-semibold text-navy">
            {profile.full_name}
          </span>
          <span className="truncate text-xs font-normal text-[#6B7280]">
            {profile.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard className="size-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <Building2 className="size-4" />
            Company Settings
          </Link>
        </DropdownMenuItem>
        {/* Prompt 2 item 7: leaked "Admin Panel" link removed. Platform staff
            reach /ops via direct nav; the proxy authorize() gate is the control. */}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
          <LogOut className="size-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
