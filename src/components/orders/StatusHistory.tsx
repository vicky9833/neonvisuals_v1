import { cn } from "@/lib/utils";
import { formatDateFull } from "@/lib/utils/format";
import type { StatusEntry } from "@/lib/engines/order";
import { ORDER_STATUS_META } from "./order-status";

interface StatusHistoryProps {
  entries: StatusEntry[];
}

/** Chronological audit trail of status changes. */
export function StatusHistory({ entries }: StatusHistoryProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-[#9CA3AF]">No status changes recorded yet.</p>
    );
  }

  return (
    <ol className="space-y-4">
      {entries.map((entry) => {
        const meta =
          ORDER_STATUS_META[entry.to_status as keyof typeof ORDER_STATUS_META];
        return (
          <li key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "mt-1 size-2.5 rounded-full",
                  meta?.dot ?? "bg-gray-400",
                )}
              />
              <span className="mt-1 w-px flex-1 bg-border" />
            </div>
            <div className="pb-1">
              <p className="text-sm font-medium text-navy">
                {meta?.label ?? entry.to_status}
                {entry.from_status ? (
                  <span className="font-normal text-[#9CA3AF]">
                    {" "}
                    from {ORDER_STATUS_META[entry.from_status as keyof typeof ORDER_STATUS_META]?.label ?? entry.from_status}
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-[#9CA3AF]">
                {formatDateFull(entry.created_at)}
              </p>
              {entry.notes ? (
                <p className="mt-1 text-sm text-[#6B7280]">{entry.notes}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
