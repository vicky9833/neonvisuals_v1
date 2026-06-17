"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  ChevronDown,
  ExternalLink,
  LogOut,
  Shield,
  UserRound,
} from "lucide-react";
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
import { useDashboard } from "@/components/dashboard/DashboardProvider";

function initials(name: string, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const router = useRouter();
  const { profile, company } = useDashboard();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full pl-1 pr-2 outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-gold">
        <Avatar className="size-8 border border-[#EDE9E3]">
          {profile.avatar_url ? (
            <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
          ) : null}
          <AvatarFallback className="bg-navy text-xs font-semibold text-white">
            {initials(profile.full_name, profile.email)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-medium text-navy sm:inline">
          {profile.full_name.split(/\s+/)[0]}
        </span>
        <ChevronDown className="size-4 text-[#9CA3AF]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        {company ? (
          <DropdownMenuLabel className="text-xs font-normal text-[#9CA3AF]">
            {company.name}
          </DropdownMenuLabel>
        ) : null}
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings/profile">
            <UserRound className="size-4" />
            My Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings/company">
            <Building2 className="size-4" />
            Company Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" />
            Visit Website
          </a>
        </DropdownMenuItem>
        {profile.role === "super_admin" ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Shield className="size-4" />
              Admin Panel
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
          <LogOut className="size-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
