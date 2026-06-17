import Papa from "papaparse";
import type { EmployeeBrief } from "@/lib/types/employee";

/** Parses an employee CSV (string) into normalized employee briefs. */
export function parseEmployeeCsv(csv: string): EmployeeBrief[] {
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  return result.data
    .map((row) => ({
      name: row.name ?? "",
      joiningDate: row["joining date"] ?? row.joiningdate ?? undefined,
      role: row.role ?? undefined,
      department: row.department ?? undefined,
      hometown: row.hometown ?? undefined,
      interests: row.interests
        ? row.interests.split(/[;,]/).map((i) => i.trim()).filter(Boolean)
        : undefined,
      acknowledgement: row.acknowledgement ?? undefined,
    }))
    .filter((brief) => brief.name.length > 0);
}
