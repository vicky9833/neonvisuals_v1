"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  BarChart3,
  FileText,
  Package,
  Receipt,
  Gift,
  FolderTree,
  Building2,
  Users,
  PenLine,
  Settings,
  UserCog,
  Mail,
  ArrowLeft,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";

interface AdminNavItem {
  label: string;
  icon: LucideIcon;
  href: string;
  external?: boolean;
}

interface NavGroup {
  label: string;
  items: AdminNavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
      { label: "Analytics", icon: BarChart3, href: "/admin/analytics" },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Sales Pipeline", icon: Target, href: "/admin/leads" },
      { label: "Quotes", icon: FileText, href: "/admin/quotes" },
      { label: "Orders", icon: Package, href: "/admin/orders" },
      { label: "Billing", icon: Receipt, href: "/admin/billing" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { label: "Products", icon: Gift, href: "/admin/products" },
      { label: "Collections", icon: FolderTree, href: "/admin/collections" },
    ],
  },
  {
    label: "Clients",
    items: [
      { label: "Companies", icon: Building2, href: "/admin/clients" },
    ],
  },
  {
    label: "Content",
    items: [{ label: "Blog", icon: PenLine, href: "/admin/blog" }],
  },
  {
    label: "System",
    items: [
      { label: "Settings", icon: Settings, href: "/admin/settings" },
      { label: "Emails", icon: Mail, href: "/admin/emails" },
      { label: "Team", icon: UserCog, href: "/admin/team" },
    ],
  },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavRow({
  item,
  active,
  onNavigate,
}: {
  item: AdminNavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const base =
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150";
  const inactive = "text-slate-400 hover:bg-white/5 hover:text-white";
  const activeCls = "border-l-[3px] border-gold bg-gold/10 pl-[9px] text-gold";

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

export function AdminSidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className="border-b border-white/10 px-6 py-5">
        <Link href="/admin" onClick={onNavigate} className="block">
          <Logo variant="horizontal" theme="light" iconSize={32} asLink={false} />
          <span className="mt-1 inline-block rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
            Admin Panel
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {GROUPS.map((group) => (
          <div key={group.label} className="pb-1">
            <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {group.label}
            </p>
            {group.items.map((item) => (
              <NavRow
                key={item.href}
                item={item}
                active={isActivePath(pathname, item.href)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        <NavRow
          item={{ label: "Back to Dashboard", icon: ArrowLeft, href: "/dashboard" }}
          active={false}
          onNavigate={onNavigate}
        />
        <NavRow
          item={{ label: "Visit Website", icon: Globe, href: "/", external: true }}
          active={false}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}

/** Permanent desktop admin sidebar (hidden below lg). */
export function AdminSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
      <AdminSidebarBody />
    </aside>
  );
}
