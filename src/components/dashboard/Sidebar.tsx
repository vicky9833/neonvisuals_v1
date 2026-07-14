"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Calendar,
  FileText,
  Gift,
  HelpCircle,
  LayoutDashboard,
  MessageCircle,
  Package,
  Palette,
  Receipt,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { WHATSAPP_NUMBER, TAGLINE } from "@/lib/utils/constants";
import type { Role } from "@/lib/auth-types";
import { useDashboard } from "@/components/dashboard/DashboardProvider";

interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
  external?: boolean;
  roles: Role[];
}

const ALL: Role[] = ["client", "admin", "super_admin"];

const MAIN_NAV: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard", roles: ALL },
  { label: "Employees", icon: Users, href: "/dashboard/employees", roles: ALL },
  { label: "Gift History", icon: Gift, href: "/dashboard/gifts", roles: ALL },
  { label: "Occasions", icon: Calendar, href: "/dashboard/occasions", roles: ALL },
  { label: "My Quotes", icon: FileText, href: "/dashboard/quotes", roles: ALL },
  { label: "Orders", icon: Package, href: "/dashboard/orders", roles: ALL },
  { label: "Billing", icon: Receipt, href: "/dashboard/billing", roles: ALL },
];

const QUICK_ACTIONS: NavItem[] = [
  { label: "Curate a Kit", icon: Palette, href: "/gift-builder", external: true, roles: ALL },
  { label: "Browse Catalog", icon: BookOpen, href: "/products", external: true, roles: ALL },
  {
    label: "WhatsApp Us",
    icon: MessageCircle,
    href: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      "Hi, I need help with my gifting order",
    )}`,
    external: true,
    roles: ALL,
  },
];

const SETTINGS_NAV: NavItem[] = [
  { label: "Settings", icon: Settings, href: "/dashboard/settings", roles: ALL },
  { label: "Help & Support", icon: HelpCircle, href: "/dashboard/support", roles: ALL },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavRow({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const base =
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150";
  const inactive = "text-slate-400 hover:bg-white/5 hover:text-white";
  const activeCls =
    "border-l-[3px] border-gold bg-gold/10 pl-[9px] text-gold";

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className={cn(base, inactive)}
      >
        <Icon className="size-5 shrink-0" />
        {item.label}
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(base, active ? activeCls : inactive)}
    >
      <Icon className="size-5 shrink-0" />
      {item.label}
    </Link>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </p>
  );
}

/** Shared sidebar content used by both the desktop sidebar and mobile drawer. */
export function SidebarBody({
  role,
  companyName,
  onNavigate,
}: {
  role: Role;
  companyName: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const visible = (items: NavItem[]) =>
    items.filter((i) => i.roles.includes(role));

  return (
    <div className="flex h-full flex-col bg-navy text-white">
      {/* Brand */}
      <div className="border-b border-white/10 px-6 py-5">
        <Link href="/dashboard" onClick={onNavigate} className="block">
          <Logo variant="horizontal" theme="light" iconSize={32} asLink={false} />
          <span className="mt-1 block text-xs text-slate-400">{TAGLINE}</span>
        </Link>
      </div>

      {/* Scrollable nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visible(MAIN_NAV).map((item) => (
          <NavRow
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            onNavigate={onNavigate}
          />
        ))}

        <div className="my-3 border-t border-white/10" />
        <SectionLabel>Quick Actions</SectionLabel>
        {visible(QUICK_ACTIONS).map((item) => (
          <NavRow key={item.href} item={item} active={false} onNavigate={onNavigate} />
        ))}

        <div className="my-3 border-t border-white/10" />
        {visible(SETTINGS_NAV).map((item) => (
          <NavRow
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Footer: company + plan */}
      <div className="border-t border-white/10 px-5 py-4">
        <p className="truncate text-sm font-semibold text-white">
          {companyName}
        </p>
        <p className="text-xs text-slate-400">Free Plan</p>
      </div>
    </div>
  );
}

/** Permanent desktop sidebar (hidden below lg). */
export function Sidebar() {
  const { profile, company } = useDashboard();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
      <SidebarBody
        role={profile.role}
        companyName={company?.name ?? "Your Company"}
      />
    </aside>
  );
}
