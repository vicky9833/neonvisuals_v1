import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
}

/** Compact metric card for dashboards. */
export function StatCard({ label, value, hint, className }: StatCardProps) {
  return (
    <Card className={cn("shadow-warm", className)}>
      <CardContent className="space-y-1 p-5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="font-heading text-2xl font-semibold text-foreground">
          {value}
        </p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
