import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";
import {
  ArrowRight,
  Calendar,
  FileText,
  Package,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ActivityItem } from "@/lib/dashboard/queries";

const ICONS: Record<ActivityItem["icon"], LucideIcon> = {
  quote: FileText,
  order: Package,
  occasion: Calendar,
  system: Sparkles,
};

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <section className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
      <h2 className="font-heading text-base font-semibold text-navy">
        Recent Activity
      </h2>

      {items.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-lg bg-secondary/60 px-4 py-10 text-center">
          <Sparkles className="size-8 text-[#9CA3AF]" />
          <p className="mt-3 text-sm font-medium text-navy">No activity yet</p>
          <p className="mt-1 text-xs text-[#6B7280]">
            Your gifting journey starts here. Explore our catalog or curate your
            first kit.
          </p>
          <Link
            href="/products"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-gold hover:underline"
          >
            Explore Products <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-4">
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <li key={item.id} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-navy">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-navy">{item.description}</p>
                  <p className="text-xs text-[#9CA3AF]">
                    {formatDistanceToNow(parseISO(item.timestamp), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
