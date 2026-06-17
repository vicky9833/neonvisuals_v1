"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DepartmentFilter({
  departments,
  value,
  onChange,
}: {
  departments: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[160px]">
        <SelectValue placeholder="Department" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All departments</SelectItem>
        {departments.map((d) => (
          <SelectItem key={d} value={d}>
            {d}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
