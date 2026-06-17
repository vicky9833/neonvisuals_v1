"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Gift, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Employee } from "@/types/employee";
import { OCCASION_TYPES, type GiftRecord } from "@/types/gift";
import { GiftStats } from "@/components/gifts/GiftStats";
import { GiftHistoryTable } from "@/components/gifts/GiftHistoryTable";
import { GiftExport } from "@/components/gifts/GiftExport";
import { RecordGiftDrawer } from "@/components/gifts/RecordGiftDrawer";

interface CompanyStats {
  totalGiftsSent: number;
  totalEmployeesGifted: number;
  overallDeskTestScore: number;
  overallReactionScore: number;
}

const COLLECTIONS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];

const DATE_PRESETS = [
  { value: "all", label: "All time" },
  { value: "12", label: "Last 12 months" },
  { value: "6", label: "Last 6 months" },
  { value: "3", label: "Last 3 months" },
];

export function GiftsClient() {
  const [records, setRecords] = useState<GiftRecord[]>([]);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [employeeId, setEmployeeId] = useState("all");
  const [occasion, setOccasion] = useState("all");
  const [datePreset, setDatePreset] = useState("12");
  const [collection, setCollection] = useState("all");
  const [recordOpen, setRecordOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ pageSize: "200" });
    if (employeeId !== "all") params.set("employeeId", employeeId);
    if (occasion !== "all") params.set("occasionType", occasion);
    if (collection !== "all") params.set("collectionCode", collection);
    if (datePreset !== "all") {
      const from = new Date();
      from.setMonth(from.getMonth() - Number(datePreset));
      params.set("from", from.toISOString().slice(0, 10));
      params.set("to", new Date().toISOString().slice(0, 10));
    }
    const [recRes, statsRes] = await Promise.all([
      fetch(`/api/gifts?${params.toString()}`),
      fetch("/api/gifts/stats"),
    ]);
    if (recRes.ok) setRecords((await recRes.json()).data.records ?? []);
    if (statsRes.ok) setStats((await statsRes.json()).data);
    setLoading(false);
  }, [employeeId, occasion, datePreset, collection]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    fetch("/api/employees?pageSize=1000")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.data?.employees) setEmployees(body.data.employees);
      })
      .catch(() => {});
  }, []);

  const isPristine =
    !loading &&
    (stats?.totalGiftsSent ?? 0) === 0 &&
    employeeId === "all" &&
    occasion === "all" &&
    collection === "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-2xl font-bold text-navy">
          Gift History
        </h1>
        <div className="flex items-center gap-2">
          <GiftExport records={records} />
          <Button
            onClick={() => setRecordOpen(true)}
            className="bg-navy text-white hover:bg-navy/90"
          >
            <Plus className="size-4" /> Record Gift
          </Button>
        </div>
      </div>

      {isPristine ? (
        <div className="flex flex-col items-center rounded-2xl border border-[#EDE9E3] bg-white px-6 py-16 text-center">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-secondary text-[#9CA3AF]">
            <Gift className="size-8" />
          </span>
          <h2 className="font-heading mt-5 text-xl font-bold text-navy">
            No gifts recorded yet
          </h2>
          <p className="mt-2 max-w-md text-sm text-[#6B7280]">
            Start recording your team&apos;s gift history to unlock smart
            recommendations and never send duplicates.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button
              onClick={() => setRecordOpen(true)}
              className="bg-navy text-white hover:bg-navy/90"
            >
              <Plus className="size-4" /> Record Your First Gift
            </Button>
            <Button asChild variant="outline">
              <Link href="/gift-builder">Or curate a new kit →</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {stats ? (
            <GiftStats
              totalGifts={stats.totalGiftsSent}
              employeesGifted={stats.totalEmployeesGifted}
              deskTestScore={stats.overallDeskTestScore}
              avgReaction={stats.overallReactionScore}
            />
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue placeholder="Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={occasion} onValueChange={setOccasion}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Occasion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All occasions</SelectItem>
                {OCCASION_TYPES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={datePreset} onValueChange={setDatePreset}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={collection} onValueChange={setCollection}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Collection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All collections</SelectItem>
                {COLLECTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    Collection {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {records.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#9CA3AF]">
              No gifts match your filters.
            </p>
          ) : (
            <GiftHistoryTable records={records} onChanged={load} />
          )}
        </>
      )}

      <RecordGiftDrawer
        open={recordOpen}
        onOpenChange={setRecordOpen}
        onSaved={load}
      />
    </div>
  );
}
