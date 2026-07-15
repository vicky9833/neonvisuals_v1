import { cn } from "@/lib/utils";

interface LeadScoreIndicatorProps {
  score: number;
  size?: "sm" | "md";
}

function scoreColor(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-gray-400";
}

/** Compact 0-100 lead score with a progress bar. */
export function LeadScoreIndicator({
  score,
  size = "sm",
}: LeadScoreIndicatorProps) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          "relative inline-block overflow-hidden rounded-full bg-secondary",
          size === "sm" ? "h-1.5 w-12" : "h-2 w-20",
        )}
      >
        <span
          className={cn("absolute inset-y-0 left-0 rounded-full", scoreColor(clamped))}
          style={{ width: `${clamped}%` }}
        />
      </span>
      <span
        className={cn(
          "font-numbers font-semibold text-navy",
          size === "sm" ? "text-xs" : "text-sm",
        )}
      >
        {clamped}
      </span>
    </span>
  );
}
