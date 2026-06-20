"use client";

import { useCallback, useEffect, useState } from "react";
import { Kanban, List, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  Lead,
  LeadPriority,
  LeadSource,
  LeadStats as LeadStatsData,
  PipelineStage,
} from "@/lib/engines/lead";
import { LeadStats } from "./LeadStats";
import { LeadPipeline } from "./LeadPipeline";
import { LeadList } from "./LeadList";
import { LeadDetail } from "./LeadDetail";
import { LeadForm } from "./LeadForm";
import { LEAD_SOURCES } from "./lead-meta";

type View = "pipeline" | "list";
type SortColumn =
  | "created_at"
  | "lead_score"
  | "next_follow_up_date"
  | "estimated_order_value";

const PRIORITIES: { value: string; label: string }[] = [
  { value: "all", label: "All Priorities" },
  { value: "hot", label: "Hot" },
  { value: "warm", label: "Warm" },
  { value: "medium", label: "Medium" },
  { value: "cold", label: "Cold" },
];

export function LeadsWorkspace() {
  const [view, setView] = useState<View>("pipeline");
  const [stats, setStats] = useState<LeadStatsData | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [source, setSource] = useState("all");
  const [sortBy, setSortBy] = useState<SortColumn>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const loadStats = useCallback(() => {
    fetch("/api/leads/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => b?.data && setStats(b.data as LeadStatsData))
      .catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (view === "pipeline") {
        const res = await fetch("/api/leads/pipeline");
        if (res.ok) {
          const body = await res.json();
          setStages(body.data.stages as PipelineStage[]);
        }
      } else {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (priority !== "all") params.set("priority", priority);
        if (source !== "all") params.set("source", source);
        params.set("sortBy", sortBy);
        params.set("sortOrder", sortOrder);
        const res = await fetch(`/api/leads?${params.toString()}`);
        if (res.ok) {
          const body = await res.json();
          setLeads(body.data.leads as Lead[]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [view, search, priority, source, sortBy, sortOrder]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const t = setTimeout(loadData, 250);
    return () => clearTimeout(t);
  }, [loadData]);

  function handleSort(column: SortColumn) {
    if (sortBy === column) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  }

  function openLead(id: string) {
    setSelectedId(id);
    setShowDetail(true);
  }

  function refresh() {
    loadStats();
    loadData();
  }

  return (
    <div className="space-y-6">
      {stats && <LeadStats stats={stats} />}

      {/* Action bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          <button
            type="button"
            onClick={() => setView("pipeline")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === "pipeline" ? "bg-navy text-white" : "text-[#6B7280]",
            )}
          >
            <Kanban className="size-4" /> Pipeline
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === "list" ? "bg-navy text-white" : "text-[#6B7280]",
            )}
          >
            <List className="size-4" /> List
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (view === "pipeline") setView("list");
              }}
              placeholder="Search name, email, company"
              className="pl-9"
            />
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-1.5 size-4" /> New Lead
          </Button>
        </div>
      </div>

      {/* Filters (list view) */}
      {view === "list" && (
        <div className="flex flex-wrap gap-3">
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Views */}
      {view === "pipeline" ? (
        <LeadPipeline stages={stages} onSelect={openLead} />
      ) : (
        <LeadList
          leads={leads}
          loading={loading}
          onSelect={openLead}
          sortBy={sortBy}
          onSort={handleSort}
        />
      )}

      <LeadDetail
        leadId={selectedId}
        open={showDetail}
        onOpenChange={setShowDetail}
        onChanged={refresh}
      />
      <LeadForm
        open={showForm}
        onOpenChange={setShowForm}
        onSaved={refresh}
      />
    </div>
  );
}
