"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Crown, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export interface TeamMemberRow {
  userId: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  status: string;
}

const ROLE_TARGETS = ["org_admin", "hr", "finance", "manager", "viewer"] as const;
const roleLabel = (r: string) => r.replace(/^org_/, "").replace(/_/g, " ");

export function TeamManager({
  rows,
  canManage,
  canRemove,
  isOwner,
  currentUserId,
}: {
  rows: TeamMemberRow[];
  canManage: boolean;
  canRemove: boolean;
  isOwner: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmTransfer, setConfirmTransfer] = useState<TeamMemberRow | null>(null);

  async function changeRole(userId: string, role: string) {
    setBusy(userId);
    try {
      const res = await fetch(`/api/team/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(j.message ?? "Could not change role."); return; }
      toast.success("Role updated.");
      router.refresh();
    } finally { setBusy(null); }
  }

  async function removeMember(userId: string) {
    setBusy(userId);
    try {
      const res = await fetch(`/api/team/members/${userId}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(j.message ?? "Could not remove member."); return; }
      toast.success("Member removed.");
      router.refresh();
    } finally { setBusy(null); }
  }

  async function doTransfer(target: TeamMemberRow) {
    setBusy(target.userId);
    try {
      const res = await fetch("/api/team/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: target.userId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(j.message ?? "Transfer failed."); return; }
      toast.success(`${target.email} is now the owner. You are now an admin.`);
      setConfirmTransfer(null);
      router.refresh();
    } finally { setBusy(null); }
  }

  return (
    <div className="rounded-xl border border-[#E5E2DC] bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E5E2DC] text-left text-[#6B7280]">
            <th className="px-4 py-3 font-medium">Member</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Department</th>
            <th className="px-4 py-3 font-medium">Status</th>
            {canManage ? <th className="px-4 py-3 font-medium text-right">Manage</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => {
            const isOwnerRow = m.role === "org_owner";
            const isSelf = m.userId === currentUserId;
            return (
              <tr key={m.userId} className="border-b border-[#F0EDE7] last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-[#2D2D2D]">{m.name || "—"}</div>
                  <div className="text-xs text-[#6B7280]">{m.email}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 capitalize">
                    {isOwnerRow ? <Crown className="size-3.5 text-gold" /> : null}
                    {roleLabel(m.role)}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#6B7280]">{m.department ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={m.status === "active" ? "text-[#2D6A4F]" : "text-[#6B7280]"}>{m.status}</span>
                </td>
                {canManage ? (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {isOwnerRow ? (
                        <span className="text-xs text-[#9CA3AF]">Owner — transfer to change</span>
                      ) : (
                        <>
                          <select
                            aria-label={`Role for ${m.email}`}
                            value={ROLE_TARGETS.includes(m.role as (typeof ROLE_TARGETS)[number]) ? m.role : "viewer"}
                            disabled={busy === m.userId}
                            onChange={(e) => changeRole(m.userId, e.target.value)}
                            className="h-8 rounded-md border border-[#E5E2DC] bg-white px-2 text-xs capitalize outline-none focus-visible:border-gold"
                          >
                            {ROLE_TARGETS.map((r) => (
                              <option key={r} value={r}>{roleLabel(r)}</option>
                            ))}
                          </select>
                          {isOwner && m.status === "active" ? (
                            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" disabled={busy === m.userId} onClick={() => setConfirmTransfer(m)}>
                              <ArrowLeftRight className="size-3.5" /> Make owner
                            </Button>
                          ) : null}
                          {canRemove && !isSelf ? (
                            <Button variant="outline" size="sm" className="h-8 text-xs text-[#7C2D36]" disabled={busy === m.userId} onClick={() => removeMember(m.userId)}>
                              {busy === m.userId ? <Loader2 className="size-3.5 animate-spin" /> : "Remove"}
                            </Button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>

      {!canManage ? (
        <p className="px-4 py-3 text-xs text-[#9CA3AF]">
          You have read-only access to the team roster. Only owners and admins can manage members.
        </p>
      ) : null}

      {confirmTransfer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h2 className="font-heading text-lg font-bold text-navy">Transfer ownership?</h2>
            <p className="mt-2 text-sm text-[#4B5563]">
              <strong>{confirmTransfer.email}</strong> will become the <strong>Owner</strong> of this
              organisation. <strong>You will become an Admin</strong> — you will lose owner-only
              powers (billing, ownership transfer, org deletion). This cannot be undone except by the
              new owner transferring it back.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmTransfer(null)} disabled={busy === confirmTransfer.userId}>Cancel</Button>
              <Button className="bg-navy text-white hover:bg-navy/90" disabled={busy === confirmTransfer.userId} onClick={() => doTransfer(confirmTransfer)}>
                {busy === confirmTransfer.userId ? <Loader2 className="size-4 animate-spin" /> : "Yes, transfer & become admin"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
