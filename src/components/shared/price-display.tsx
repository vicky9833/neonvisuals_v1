import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";

interface PriceDisplayProps {
  /** Amount in whole Rupees (integer). */
  amount: number;
  className?: string;
  /** Optional "from" prefix for ranged pricing. */
  prefix?: string;
  /** Optional per-unit suffix, e.g. "/ employee". */
  suffix?: string;
}

/** Renders a Rupee price using Indian numbering. */
export function PriceDisplay({
  amount,
  className,
  prefix,
  suffix,
}: PriceDisplayProps) {
  return (
    <span className={cn("font-heading tabular-nums", className)}>
      {prefix ? <span className="mr-1 text-muted-foreground">{prefix}</span> : null}
      {formatCurrency(amount)}
      {suffix ? (
        <span className="ml-1 text-sm font-normal text-muted-foreground">
          {suffix}
        </span>
      ) : null}
    </span>
  );
}
