import Link from "next/link";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { SetPageTitle } from "@/components/dashboard/DashboardProvider";
import { EmployeeAvatar } from "@/components/employees/EmployeeAvatar";
import { getEmployee } from "@/lib/employees/queries";
import { DIETARY_PREFERENCES } from "@/types/employee";

type Params = { params: Promise<{ id: string }> };

function fmt(value?: string | null): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "d MMM yyyy");
  } catch {
    return value;
  }
}

export default async function EmployeeDetailPage({ params }: Params) {
  const { id } = await params;
  const employee = await getEmployee(id);
  if (!employee) notFound();

  const diet =
    DIETARY_PREFERENCES.find((d) => d.value === employee.dietary_preference)
      ?.label ?? "—";

  const rows: Array<[string, string]> = [
    ["Email", employee.email],
    ["Employee Code", employee.employee_code ?? "—"],
    ["Phone", employee.phone ?? "—"],
    ["Department", employee.department ?? "—"],
    ["Designation", employee.designation ?? "—"],
    ["Manager", employee.manager_name ?? "—"],
    ["Date of Birth", fmt(employee.date_of_birth)],
    ["Joining Date", fmt(employee.joining_date)],
    ["T-Shirt Size", employee.tshirt_size ?? "—"],
    ["Dietary", diet],
    ["Hobbies & Interests", employee.hobbies ?? "—"],
    [
      "Address",
      [employee.delivery_address, employee.city, employee.pincode]
        .filter(Boolean)
        .join(", ") || "—",
    ],
  ];

  return (
    <div className="space-y-6">
      <SetPageTitle title={employee.name} />
      <Link
        href="/dashboard/employees"
        className="inline-flex items-center gap-1 text-sm font-medium text-[#6B7280] hover:text-navy"
      >
        <ArrowLeft className="size-4" /> Back to Team
      </Link>

      <div className="flex items-center gap-4">
        <EmployeeAvatar name={employee.name} size="lg" />
        <div>
          <h1 className="font-heading text-2xl font-bold text-navy">
            {employee.name}
          </h1>
          <p className="text-sm text-[#6B7280]">
            {employee.designation ?? "—"}
          </p>
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-4 rounded-xl border border-[#EDE9E3] bg-white p-6 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs uppercase tracking-wide text-[#9CA3AF]">
              {label}
            </dt>
            <dd className="mt-0.5 text-[#333333]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
