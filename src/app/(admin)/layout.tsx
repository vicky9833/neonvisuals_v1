import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const NAV = [
  { label: "Overview", href: "/admin" },
  { label: "Leads", href: "/admin/leads" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Products", href: "/admin/products" },
  { label: "Clients", href: "/admin/clients" },
  { label: "Blog", href: "/admin/blog" },
  { label: "Analytics", href: "/admin/analytics" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:block">
        <div className="flex h-16 items-center border-b border-sidebar-border px-6">
          <Logo className="text-sidebar-foreground" />
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-button px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 bg-background">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
