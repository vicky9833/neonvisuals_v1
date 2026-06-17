import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  className?: string;
}

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  info: "bg-navy/10 text-navy",
  success: "bg-accentGreen/15 text-accentGreen",
  warning: "bg-gold/20 text-[#8a6d2f]",
  danger: "bg-burgundy/15 text-burgundy",
};

/** Small status pill with brand-aligned tones. */
export function StatusBadge({ label, tone = "neutral", className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent font-medium", TONE_CLASSES[tone], className)}
    >
      {label}
    </Badge>
  );
}
