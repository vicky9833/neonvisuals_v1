import { cn } from "@/lib/utils";

interface AdminMetricCardProps {
  label: string;
  value: string;
  accent?: "navy" | "gold";
  hint?: string;
}

export function AdminMetricCard({
  label,
  value,
  accent = "navy",
  hint,
}: AdminMetricCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#EDE9E3] bg-white shadow-sm">
      <div className={cn("h-1", accent === "gold" ? "bg-gold" : "bg-navy")} />
      <div className="p-5">
        <p className="text-sm font-medium text-[#6B7280]">{label}</p>
        <p
          className={cn(
            "font-numbers mt-2 text-2xl font-bold",
            accent === "gold" ? "text-gold" : "text-navy",
          )}
        >
          {value}
        </p>
        {hint ? <p className="mt-1 text-xs text-[#9CA3AF]">{hint}</p> : null}
      </div>
    </div>
  );
}
