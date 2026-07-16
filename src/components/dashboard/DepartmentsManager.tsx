"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface DepartmentRowView {
  id: string;
  name: string;
  managerId: string | null;
  employeeCount: number;
}
export interface MemberOption {
  userId: string;
  label: string;
  role: string;
}

export function DepartmentsManager({
  rows,
  members,
  canManage,
  isPro,
}: {
  rows: DepartmentRowView[];
  members: MemberOption[];
  canManage: boolean;
  isPro: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isPro) {
    return (
      <div className="rounded-xl border border-[#E5E2DC] bg-secondary/40 p-6 text-sm text-[#6B7280]">
        Departments &amp; managers are a <span className="font-medium text-navy">Pro</span> feature. Upgrade your
        plan to organise your team into departments and grant managers own-department access.
      </div>
    );
  }

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    const res = await fetch("/api/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      toast.error(b.message ?? "Could not create department.");
      return;
    }
    setName("");
    router.refresh();
  }

  async function assignManager(id: string, managerId: string) {
    const res = await fetch(`/api/departments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manager_id: managerId || null }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      toast.error(b.message ?? "Could not assign manager.");
      return;
    }
    toast.success("Manager updated.");
    router.refresh();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      toast.error(b.message ?? "Could not delete department.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <div className="flex gap-2">
          <Input
            placeholder="New department name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={create} disabled={busy || !name.trim()} className="bg-navy text-white hover:bg-navy/90">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[#E5E2DC]">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary text-xs uppercase text-[#6B7280]">
            <tr>
              <th className="px-4 py-2">Department</th>
              <th className="px-4 py-2">Employees</th>
              <th className="px-4 py-2">Manager</th>
              {canManage ? <th className="px-4 py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[#9CA3AF]">
                  No departments yet.
                </td>
              </tr>
            ) : (
              rows.map((d) => (
                <tr key={d.id} className="border-t border-[#EDE9E3] bg-white">
                  <td className="px-4 py-2 font-medium text-navy">{d.name}</td>
                  <td className="px-4 py-2 text-[#6B7280]">{d.employeeCount}</td>
                  <td className="px-4 py-2">
                    {canManage ? (
                      <select
                        aria-label={`Manager for ${d.name}`}
                        defaultValue={d.managerId ?? ""}
                        onChange={(e) => assignManager(d.id, e.target.value)}
                        className="rounded-md border border-[#E5E2DC] bg-white px-2 py-1 text-sm"
                      >
                        <option value="">Unassigned</option>
                        {members.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.label} ({m.role})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[#6B7280]">
                        {members.find((m) => m.userId === d.managerId)?.label ?? "Unassigned"}
                      </span>
                    )}
                  </td>
                  {canManage ? (
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => remove(d.id)}
                        aria-label={`Delete ${d.name}`}
                        className="text-[#9CA3AF] hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
