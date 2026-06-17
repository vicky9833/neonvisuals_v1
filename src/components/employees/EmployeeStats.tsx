import { Building2 } from "lucide-react";

export function EmployeeStats({
  departments,
}: {
  departments: Array<{ department: string; count: number }>;
}) {
  if (departments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {departments.map((d) => (
        <span
          key={d.department}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#EDE9E3] bg-white px-3 py-1 text-xs font-medium text-[#6B7280]"
        >
          <Building2 className="size-3.5 text-navy" />
          {d.department}
          <span className="font-numbers font-semibold text-navy">
            {d.count}
          </span>
        </span>
      ))}
    </div>
  );
}
