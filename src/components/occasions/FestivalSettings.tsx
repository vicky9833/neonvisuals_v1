"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { FestivalPreference } from "@/types/occasion";

export function FestivalSettings() {
  const [prefs, setPrefs] = useState<FestivalPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/occasions/festivals")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.data) setPrefs(body.data);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggle(festivalId: string) {
    setPrefs((prev) =>
      prev.map((p) =>
        p.festival_id === festivalId ? { ...p, is_active: !p.is_active } : p,
      ),
    );
  }
  function setCustomDate(festivalId: string, date: string) {
    setPrefs((prev) =>
      prev.map((p) =>
        p.festival_id === festivalId
          ? { ...p, custom_date: date || null, effective_date: date || p.default_date }
          : p,
      ),
    );
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/occasions/festivals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferences: prefs.map((p) => ({
          festival_id: p.festival_id,
          is_active: p.is_active,
          custom_date: p.custom_date,
        })),
      }),
    });
    setSaving(false);
    if (res.ok) toast.success("Festival preferences saved");
    else toast.error("Could not save preferences");
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-secondary" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="divide-y divide-[#EDE9E3] rounded-xl border border-[#EDE9E3] bg-white">
        {prefs.map((p) => (
          <div
            key={p.festival_id}
            className="flex items-center gap-3 px-4 py-3"
          >
            <Checkbox
              checked={p.is_active}
              onCheckedChange={() => toggle(p.festival_id)}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-navy">{p.name}</p>
              <p className="text-xs text-[#9CA3AF]">
                {format(parseISO(p.effective_date), "d MMM yyyy")}
                {p.custom_date ? " (custom)" : ""}
              </p>
            </div>
            {editingDate === p.festival_id ? (
              <Input
                type="date"
                defaultValue={p.effective_date}
                className="h-8 w-40"
                onChange={(e) => setCustomDate(p.festival_id, e.target.value)}
                onBlur={() => setEditingDate(null)}
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingDate(p.festival_id)}
                className="text-xs font-medium text-gold hover:underline"
              >
                Edit Date
              </button>
            )}
          </div>
        ))}
      </div>
      <Button
        onClick={save}
        disabled={saving}
        className="bg-navy text-white hover:bg-navy/90"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : "Save Preferences"}
      </Button>
    </div>
  );
}
