"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { REACTION_LABELS, type GiftRecord } from "@/types/gift";
import { DeskTestTracker } from "@/components/gifts/DeskTestTracker";

const DESK_BADGE: Record<string, { icon: string; label: string; cls: string }> = {
  on_desk: { icon: "🟢", label: "On Desk", cls: "bg-[#2D6A4F]/10 text-[#2D6A4F]" },
  kept_elsewhere: { icon: "📦", label: "Kept Elsewhere", cls: "bg-blue-50 text-blue-600" },
  not_kept: { icon: "❌", label: "Not Kept", cls: "bg-destructive/10 text-destructive" },
  unknown: { icon: "❓", label: "Unknown", cls: "bg-[#9CA3AF]/15 text-[#6B7280]" },
};

const REACTION_ICON: Record<string, string> = {
  loved_it: "❤️",
  liked_it: "😊",
  neutral: "😐",
  unknown: "",
};

export function GiftCard({
  gift,
  onChanged,
}: {
  gift: GiftRecord;
  onChanged?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const desk = DESK_BADGE[gift.desk_test_status] ?? DESK_BADGE.unknown;
  const reactionIcon = gift.recipient_reaction
    ? REACTION_ICON[gift.recipient_reaction]
    : "";

  return (
    <div className="relative border-l-2 border-[#EDE9E3] pl-5 pb-5 last:pb-0">
      <span className="absolute left-[-7px] top-1 size-3 rounded-full border-2 border-white bg-gold" />
      <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
        {format(parseISO(gift.gifted_date), "MMM yyyy")} ·{" "}
        {gift.occasion_label ?? gift.occasion_type}
      </p>
      <p className="mt-0.5 font-medium text-navy">
        {gift.product_sku} {gift.product_name}
      </p>
      <p className="text-xs text-[#6B7280]">
        {[gift.packaging_tier, gift.personalisation_level]
          .filter(Boolean)
          .join(" · ") || "—"}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
            desk.cls,
          )}
        >
          {desk.icon} {desk.label}
        </span>
        {gift.recipient_reaction && gift.recipient_reaction !== "unknown" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-navy">
            {reactionIcon} {REACTION_LABELS[gift.recipient_reaction]}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-0.5 text-[11px] font-medium text-gold hover:underline"
        >
          {open ? "Hide" : "Details"}
          <ChevronDown
            className={cn("size-3 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {open ? (
        <div className="mt-3 space-y-3">
          {gift.narrative_message ? (
            <p className="rounded-lg bg-secondary/50 p-2 text-xs italic text-[#6B7280]">
              &ldquo;{gift.narrative_message}&rdquo;
            </p>
          ) : null}
          {gift.delivery_status ? (
            <p className="text-xs text-[#6B7280]">
              Delivery: {gift.delivery_status.replace(/_/g, " ")}
            </p>
          ) : null}
          {gift.delivery_status === "delivered" ||
          gift.desk_test_status !== "unknown" ? (
            <DeskTestTracker gift={gift} onUpdated={onChanged} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
