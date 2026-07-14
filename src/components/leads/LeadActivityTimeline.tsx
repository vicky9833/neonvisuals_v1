import { formatDateFull } from "@/lib/utils/format";
import type { LeadActivity } from "@/lib/engines/lead";
import { ACTIVITY_META, OUTCOME_META } from "./lead-meta";

export function LeadActivityTimeline({
  activities,
}: {
  activities: LeadActivity[];
}) {
  if (activities.length === 0) {
    return (
      <p className="py-4 text-sm text-[#9CA3AF]">
        No activity logged yet. Use the form above to record your first
        interaction.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {activities.map((a) => {
        const meta = ACTIVITY_META[a.activity_type];
        const outcome = a.outcome ? OUTCOME_META[a.outcome] : null;
        return (
          <li key={a.id} className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm">
              {meta.icon}
            </span>
            <div className="min-w-0 flex-1 border-b border-border pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-navy">{a.title}</p>
                {outcome && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${outcome.badge}`}
                  >
                    {outcome.label}
                  </span>
                )}
              </div>
              {a.description && (
                <p className="mt-0.5 text-sm text-[#6B7280]">{a.description}</p>
              )}
              {a.follow_up_date && (
                <p className="mt-1 text-xs text-gold">
                  Follow-up set for {a.follow_up_date}
                  {a.follow_up_note ? ` - ${a.follow_up_note}` : ""}
                </p>
              )}
              <p className="mt-1 text-[11px] text-[#9CA3AF]">
                {meta.label} · {formatDateFull(a.performed_at)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
