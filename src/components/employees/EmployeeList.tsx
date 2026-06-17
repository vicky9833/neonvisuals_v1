"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { differenceInYears, format, parseISO } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  MoreVertical,
  Plus,
  Search,
  Upload,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadCSVTemplate } from "@/lib/employees/csv";
import type { Employee } from "@/types/employee";
import { EmployeeAvatar } from "@/components/employees/EmployeeAvatar";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { EmployeeDetail } from "@/components/employees/EmployeeDetail";
import { DepartmentFilter } from "@/components/employees/DepartmentFilter";

const PAGE_SIZE = 25;

function fmtJoining(value?: string | null): string {
  if (!value) return "—";
  try {
    const d = parseISO(value);
    const years = differenceInYears(new Date(), d);
    return `${format(d, "MMM yyyy")}${years > 0 ? ` · ${years}y` : ""}`;
  } catch {
    return "—";
  }
}

function fmtBirthday(value?: string | null): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "MMM d");
  } catch {
    return "—";
  }
}

export function EmployeeList() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [department, setDepartment] = useState("all");
  const [status, setStatus] = useState("active");
  const [sortBy, setSortBy] = useState("name");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Employee | undefined>(undefined);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);

  // Debounce search.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      sortBy,
    });
    if (debounced) params.set("search", debounced);
    if (department !== "all") params.set("department", department);
    if (status !== "all") params.set("isActive", String(status === "active"));

    const res = await fetch(`/api/employees?${params.toString()}`);
    if (res.ok) {
      const body = await res.json();
      setEmployees(body.data.employees);
      setTotal(body.data.total);
    }
    setLoading(false);
  }, [page, sortBy, debounced, department, status]);

  useEffect(() => {
    void load();
  }, [load]);

  // Load department list once.
  useEffect(() => {
    fetch("/api/employees/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.data?.departments) {
          setDepartments(
            body.data.departments.map(
              (d: { department: string }) => d.department,
            ),
          );
        }
      })
      .catch(() => {});
  }, []);

  const isPristine =
    !loading &&
    total === 0 &&
    debounced === "" &&
    department === "all" &&
    status === "active";

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  function openCreate() {
    setFormMode("create");
    setEditing(undefined);
    setFormOpen(true);
  }
  function openEdit(employee: Employee) {
    setFormMode("edit");
    setEditing(employee);
    setDetailOpen(false);
    setFormOpen(true);
  }
  function openDetail(employee: Employee) {
    setSelected(employee);
    setDetailOpen(true);
  }

  const headerActions = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <Button onClick={openCreate} className="bg-navy text-white hover:bg-navy/90">
          <Plus className="size-4" /> Add Employee
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/employees/upload">
            <Upload className="size-4" /> Upload CSV
          </Link>
        </Button>
      </div>
    ),
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-2xl font-bold text-navy">
          Team Members
        </h1>
        {headerActions}
      </div>

      {isPristine ? (
        <EmptyState onAdd={openCreate} />
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, or department"
                className="h-9 pl-9"
              />
            </div>
            <DepartmentFilter
              departments={departments}
              value={department}
              onChange={(v) => {
                setDepartment(v);
                setPage(1);
              }}
            />
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort: Name</SelectItem>
                <SelectItem value="department">Sort: Department</SelectItem>
                <SelectItem value="joining_date">Sort: Joining</SelectItem>
                <SelectItem value="date_of_birth">Sort: Birthday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-[#EDE9E3] bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#EDE9E3] bg-secondary/50 text-xs uppercase text-[#6B7280]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Birthday</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="cursor-pointer border-b border-[#EDE9E3] last:border-0 hover:bg-secondary/30"
                    onClick={() => openDetail(emp)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar name={emp.name} size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium text-navy">{emp.name}</p>
                          <p className="truncate text-xs text-[#9CA3AF]">
                            {emp.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[#333333]">{emp.department ?? "—"}</p>
                      <p className="text-xs text-[#9CA3AF]">
                        {emp.designation ?? ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">
                      {fmtJoining(emp.joining_date)}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">
                      {fmtBirthday(emp.date_of_birth)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={emp.is_active} />
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowActions
                        employee={emp}
                        onView={() => openDetail(emp)}
                        onEdit={() => openEdit(emp)}
                        onChanged={load}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {employees.map((emp) => (
              <div
                key={emp.id}
                onClick={() => openDetail(emp)}
                className="flex items-center gap-3 rounded-xl border border-[#EDE9E3] bg-white p-4"
              >
                <EmployeeAvatar name={emp.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-navy">{emp.name}</p>
                  <p className="truncate text-xs text-[#9CA3AF]">{emp.email}</p>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    {emp.department ?? "—"} · Joined {fmtJoining(emp.joining_date)}
                  </p>
                </div>
                <StatusBadge active={emp.is_active} />
              </div>
            ))}
          </div>

          {!loading && employees.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#9CA3AF]">
              No employees match your filters.
            </p>
          ) : null}

          {/* Pagination */}
          {total > 0 ? (
            <div className="flex items-center justify-between text-sm text-[#6B7280]">
              <span>
                Showing {start}-{end} of {total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" /> Prev
                </Button>
                <span className="font-numbers">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      <EmployeeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        employee={editing}
        departments={departments}
        onSaved={load}
      />
      <EmployeeDetail
        open={detailOpen}
        onOpenChange={setDetailOpen}
        employee={selected}
        onEdit={openEdit}
        onChanged={load}
      />
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
        active
          ? "bg-[#2D6A4F]/10 text-[#2D6A4F]"
          : "bg-[#9CA3AF]/15 text-[#6B7280]"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function RowActions({
  employee,
  onView,
  onEdit,
  onChanged,
}: {
  employee: Employee;
  onView: () => void;
  onEdit: () => void;
  onChanged: () => void;
}) {
  async function toggle() {
    await fetch(`/api/employees/${employee.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !employee.is_active }),
    });
    onChanged();
  }
  async function remove() {
    await fetch(`/api/employees/${employee.id}`, { method: "DELETE" });
    onChanged();
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-md p-1.5 text-[#6B7280] hover:bg-secondary">
        <MoreVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onView}>View Profile</DropdownMenuItem>
        <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem onSelect={toggle}>
          {employee.is_active ? "Deactivate" : "Reactivate"}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={remove}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-[#EDE9E3] bg-white px-6 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-secondary text-[#9CA3AF]">
        <UsersRound className="size-8" />
      </span>
      <h2 className="font-heading mt-5 text-xl font-bold text-navy">
        Your team list is empty
      </h2>
      <p className="mt-2 max-w-md text-sm text-[#6B7280]">
        Add your employees to unlock personalised gifting, occasion tracking,
        and the memory engine.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={onAdd} className="bg-navy text-white hover:bg-navy/90">
          <Plus className="size-4" /> Add Employee Manually
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/employees/upload">
            <Upload className="size-4" /> Upload CSV
          </Link>
        </Button>
        <Button variant="ghost" onClick={downloadCSVTemplate}>
          <Download className="size-4" /> Download Template
        </Button>
      </div>
    </div>
  );
}
