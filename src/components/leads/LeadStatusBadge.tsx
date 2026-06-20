import { cn } from "@/lib/utils";
import type { LeadPriority, LeadStatus } from "@/lib/engines/lead";
import { PRIORITY_META, STATUS_META } from "./lead-meta";

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        meta.badge,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export function PriorityDot({
  priority,
  withLabel = false,
}: {
  priority: LeadPriority;
  withLabel?: boolean;
}) {
  const meta = PRIORITY_META[priority];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", meta.dot)} />
      {withLabel && (
        <span className={cn("text-xs font-medium", meta.text)}>
          {meta.label}
        </span>
      )}
    </span>
  );
}
