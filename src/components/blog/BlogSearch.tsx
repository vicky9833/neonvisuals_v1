"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface BlogSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function BlogSearch({ value, onChange }: BlogSearchProps) {
  return (
    <div className="relative w-full max-w-xs">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search articles"
        className="pl-9"
      />
    </div>
  );
}
