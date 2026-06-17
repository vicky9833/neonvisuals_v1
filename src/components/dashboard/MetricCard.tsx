import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  subtitle: string;
  accent: "navy" | "gold";
  emptyHref: string;
  emptyLabel: string;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  subtitle,
  accent,
  emptyHref,
  emptyLabel,
}: MetricCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#EDE9E3] bg-white shadow-sm">
      <div className={cn("h-1", accent === "gold" ? "bg-gold" : "bg-navy")} />
      <div className="p-6">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-[#6B7280]">{label}</p>
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-lg",
              accent === "gold"
                ? "bg-gold/10 text-gold"
                : "bg-navy/10 text-navy",
            )}
          >
            <Icon className="size-5" />
          </span>
        </div>
        <p className="font-numbers mt-3 text-3xl font-bold text-navy">
          {value.toLocaleString("en-IN")}
        </p>
        {value === 0 ? (
          <Link
            href={emptyHref}
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-gold hover:underline"
          >
            {emptyLabel}
            <ArrowRight className="size-3.5" />
          </Link>
        ) : (
          <p className="mt-1 text-sm text-[#9CA3AF]">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
