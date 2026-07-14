"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GiftRecord, GiftRecommendation } from "@/types/gift";
import { GiftTimeline } from "@/components/gifts/GiftTimeline";
import { RecommendationList } from "@/components/gifts/RecommendationList";
import { RecordGiftDrawer } from "@/components/gifts/RecordGiftDrawer";

interface Stats {
  totalGifts: number;
  giftTimeline: GiftRecord[];
  deskTestScore: number;
  avgReaction: number;
  collectionsReceived: string[];
  lastGiftedDate: string | null;
}

export function EmployeeGiftPanel({
  employeeId,
  employeeName,
}: {
  employeeId: string;
  employeeName: string;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recs, setRecs] = useState<GiftRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordOpen, setRecordOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [statsRes, recsRes] = await Promise.all([
      fetch(`/api/employees/${employeeId}/gifts`),
      fetch("/api/gifts/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, occasion: "recognition", count: 4 }),
      }),
    ]);
    if (statsRes.ok) setStats((await statsRes.json()).data);
    if (recsRes.ok) setRecs((await recsRes.json()).data ?? []);
    setLoading(false);
  }, [employeeId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-5 animate-spin text-[#9CA3AF]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {stats && stats.totalGifts > 0 ? (
        <div className="rounded-lg bg-secondary/50 p-3 text-xs text-[#6B7280]">
          <span className="font-medium text-navy">{stats.totalGifts}</span> gifts
          {" · "}Desk test{" "}
          <span className="font-medium text-navy">{stats.deskTestScore}%</span>
          {" · "}Avg reaction{" "}
          <span className="font-medium text-navy">
            {stats.avgReaction > 0 ? `${stats.avgReaction}/4` : "-"}
          </span>
          {stats.collectionsReceived.length > 0 ? (
            <> {" · "}Collections {stats.collectionsReceived.join(", ")}</>
          ) : null}
        </div>
      ) : null}

      <GiftTimeline gifts={stats?.giftTimeline ?? []} onChanged={load} />

      <Button
        variant="outline"
        size="sm"
        onClick={() => setRecordOpen(true)}
        className="w-full"
      >
        <Plus className="size-4" /> Record a Gift for {employeeName.split(/\s+/)[0]}
      </Button>

      <div>
        <h4 className="font-heading mb-2 text-sm font-semibold text-navy">
          Recommended Next Gifts
        </h4>
        <RecommendationList recommendations={recs} />
      </div>

      <RecordGiftDrawer
        open={recordOpen}
        onOpenChange={setRecordOpen}
        defaultEmployeeId={employeeId}
        onSaved={load}
      />
    </div>
  );
}
