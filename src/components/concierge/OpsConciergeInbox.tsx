"use client";

import { useEffect, useState } from "react";

interface OpsRequest {
  id: string;
  company_name: string | null;
  subject: string;
  urgency: string;
  status: string;
  assigned_staff_id: string | null;
  created_at: string;
}

/**
 * Ops concierge inbox (Prompt 7d, §6C) — the cross-org queue. Fetches /api/ops/concierge, which is
 * gated by `platform.concierge.inbox` (owner/admin/ops/support). A tenant/finance caller gets 403.
 */
export function OpsConciergeInbox() {
  const [requests, setRequests] = useState<OpsRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/ops/concierge");
      if (!res.ok) { setError("You do not have access to the concierge inbox."); return; }
      const j = await res.json().catch(() => ({}));
      setRequests(j?.data?.requests ?? []);
    })();
  }, []);

  if (error) return <p className="text-sm text-[#7C2D36]">{error}</p>;

  return (
    <div className="rounded-xl border border-[#E5E2DC] bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E5E2DC] text-left text-[#6B7280]">
            <th className="px-4 py-3 font-medium">Organisation</th>
            <th className="px-4 py-3 font-medium">Subject</th>
            <th className="px-4 py-3 font-medium">Urgency</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Assigned</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id} className="border-b border-[#F0EDE7] last:border-0">
              <td className="px-4 py-3 text-[#2D2D2D]">{r.company_name ?? "—"}</td>
              <td className="px-4 py-3 text-[#2D2D2D]">{r.subject}</td>
              <td className="px-4 py-3 capitalize text-[#6B7280]">{r.urgency}</td>
              <td className="px-4 py-3 capitalize text-[#6B7280]">{r.status.replace(/_/g, " ")}</td>
              <td className="px-4 py-3 text-[#6B7280]">{r.assigned_staff_id ? "Assigned" : "Shared queue"}</td>
            </tr>
          ))}
          {requests.length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-[#6B7280]">No concierge requests yet.</td></tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
