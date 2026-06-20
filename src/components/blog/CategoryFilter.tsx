"use client";

import { cn } from "@/lib/utils";
import { CATEGORY_OPTIONS } from "./blog-meta";

interface CategoryFilterProps {
  active: string;
  onChange: (category: string) => void;
}

export function CategoryFilter({ active, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORY_OPTIONS.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onChange(c.value)}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
            active === c.value
              ? "border-navy bg-navy text-white"
              : "border-border text-[#6B7280] hover:border-navy hover:text-navy",
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
