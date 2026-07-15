"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DateRange {
  start: string;
  end: string;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function presetRange(preset: string): DateRange {
  const now = new Date();
  const y = now.getFullYear();
  switch (preset) {
    case "this_month":
      return { start: iso(new Date(y, now.getMonth(), 1)), end: iso(now) };
    case "this_quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return { start: iso(new Date(y, q * 3, 1)), end: iso(now) };
    }
    case "this_year":
      return { start: `${y}-01-01`, end: iso(now) };
    case "last_year":
      return { start: `${y - 1}-01-01`, end: `${y - 1}-12-31` };
    default:
      return { start: `${y}-01-01`, end: iso(now) };
  }
}

const PRESETS = [
  { value: "this_month", label: "This Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "this_year", label: "This Year" },
  { value: "last_year", label: "Last Year" },
  { value: "custom", label: "Custom Range" },
];

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [preset, setPreset] = useState("this_year");

  function handlePreset(p: string) {
    setPreset(p);
    if (p !== "custom") onChange(presetRange(p));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={preset} onValueChange={handlePreset}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={value.start}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
            className="w-[150px]"
          />
          <span className="text-[#9CA3AF]">-</span>
          <Input
            type="date"
            value={value.end}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
            className="w-[150px]"
          />
        </div>
      )}
    </div>
  );
}
