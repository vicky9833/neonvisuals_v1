"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { DeskTestStatus, GiftRecord } from "@/types/gift";

const OPTIONS: { value: DeskTestStatus; label: string; icon: string }[] = [
  { value: "on_desk", label: "On desk", icon: "🟢" },
  { value: "kept_elsewhere", label: "Kept elsewhere", icon: "📦" },
  { value: "not_kept", label: "Not kept", icon: "❌" },
  { value: "unknown", label: "Haven't checked", icon: "❓" },
];

export function DeskTestTracker({
  gift,
  onUpdated,
}: {
  gift: GiftRecord;
  onUpdated?: () => void;
}) {
  const [status, setStatus] = useState<DeskTestStatus>(gift.desk_test_status);
  const [busy, setBusy] = useState(false);

  async function update(value: DeskTestStatus) {
    setBusy(true);
    const res = await fetch(`/api/gifts/${gift.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deskTestStatus: value }),
    });
    setBusy(false);
    if (res.ok) {
      setStatus(value);
      toast.success("Desk test updated");
      onUpdated?.();
    } else {
      toast.error("Could not update desk test");
    }
  }

  return (
    <div className="rounded-lg border border-[#EDE9E3] bg-secondary/40 p-3">
      <p className="mb-2 text-xs font-medium text-navy">
        Is this gift still on their desk?
      </p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={busy}
            onClick={() => update(o.value)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              status === o.value
                ? "border-navy bg-navy text-white"
                : "border-[#EDE9E3] bg-white text-[#6B7280] hover:border-navy/40",
            )}
          >
            {o.icon} {o.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-[#9CA3AF]">
        Last checked:{" "}
        {gift.desk_test_checked_date
          ? new Date(gift.desk_test_checked_date).toLocaleDateString("en-IN")
          : "Never"}
      </p>
    </div>
  );
}
