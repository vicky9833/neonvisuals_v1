import Link from "next/link";
import {
  FileText,
  Package,
  Target,
  Receipt,
  PenLine,
  type LucideIcon,
} from "lucide-react";
import { formatRelativeDate } from "@/lib/utils/format";
import type { AdminActivityItem } from "@/lib/admin/overview";

const ICONS: Record<AdminActivityItem["icon"], LucideIcon> = {
  quote: FileText,
  order: Package,
  lead: Target,
  invoice: Receipt,
  blog: PenLine,
};

export function RecentActivityFeed({ items }: { items: AdminActivityItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-[#9CA3AF]">No recent activity yet.</p>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        return (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-center gap-3 py-2.5 transition-colors hover:bg-secondary/40"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-navy">
                <Icon className="size-4" />
              </span>
              <span className="flex-1 text-sm text-[#2D2D2D]">
                {item.description}
              </span>
              <span className="text-xs text-[#9CA3AF]">
                {formatRelativeDate(item.timestamp)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
