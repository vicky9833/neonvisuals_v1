"use client";

import type { GiftRecord } from "@/types/gift";
import { GiftCard } from "@/components/gifts/GiftCard";

export function GiftTimeline({
  gifts,
  onChanged,
}: {
  gifts: GiftRecord[];
  onChanged?: () => void;
}) {
  if (gifts.length === 0) {
    return (
      <p className="rounded-lg bg-secondary/50 px-4 py-6 text-center text-sm text-[#6B7280]">
        No gifts recorded yet.
      </p>
    );
  }
  return (
    <div className="pt-1">
      {gifts.map((g) => (
        <GiftCard key={g.id} gift={g} onChanged={onChanged} />
      ))}
    </div>
  );
}
