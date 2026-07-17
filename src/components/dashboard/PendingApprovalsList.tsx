"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export interface PendingApprovalRow {
  id: string;
  quoteRef: string;
  occasionLabel: string | null;
  amountLabel: string;
  routedTo: string | null;
  overBudget: boolean;
}

/**
 * Approval view actions (Prompt 7b item 4). Distinct Approve / Reject buttons per pending quote;
 * over-budget is an INFORMATIONAL badge (never blocks). POSTs to the approve/reject routes;
 * a 10s AbortController timeout or a failure retains the row unchanged.
 */
export function PendingApprovalsList({ rows }: { rows: PendingApprovalRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, action: "approve" | "reject") {
    setBusy(`${id}:${action}`);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(`/api/quotes/${id}/${action}`, { method: "POST", signal: controller.signal });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.message ?? `Could not ${action} the quote.`);
        return;
      }
      const status = j?.data?.approval_status;
      toast.success(
        status === "approved" ? "Quote approved."
          : status === "rejected" ? "Quote rejected."
          : status === "pending" ? (j.message ?? "Routed to the next approver.")
          : (j.message ?? "Done."),
      );
      router.refresh();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        toast.error("Request timed out — the quote is unchanged. Please try again.");
      } else {
        toast.error(`Could not ${action} the quote.`);
      }
    } finally {
      clearTimeout(timer);
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[#E5E2DC] bg-[#F5F0E8] p-8 text-center">
        <p className="text-sm text-[#6B7280]">No quotes are awaiting your approval.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E5E2DC] bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E5E2DC] text-left text-[#6B7280]">
            <th className="px-4 py-3 font-medium">Quote</th>
            <th className="px-4 py-3 font-medium">Occasion</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium text-right">Decision</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-[#F0EDE7] last:border-0">
              <td className="px-4 py-3">
                <div className="font-medium text-[#2D2D2D]">{r.quoteRef}</div>
                {r.routedTo ? <div className="text-xs text-[#6B7280]">routed to {r.routedTo.replace(/^org_/, "")}</div> : null}
              </td>
              <td className="px-4 py-3 text-[#6B7280]">{r.occasionLabel ?? "—"}</td>
              <td className="px-4 py-3">
                <span className="text-[#2D2D2D]">{r.amountLabel}</span>
                {r.overBudget ? (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#FBEFD3] px-2 py-0.5 text-[11px] font-medium text-[#7C2D36]">
                    <AlertTriangle className="size-3" /> Over budget
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    className="h-8 bg-navy text-xs text-white hover:bg-navy/90"
                    disabled={busy !== null}
                    onClick={() => act(r.id, "approve")}
                  >
                    {busy === `${r.id}:approve` ? <Loader2 className="size-3.5 animate-spin" /> : "Approve"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-[#7C2D36]"
                    disabled={busy !== null}
                    onClick={() => act(r.id, "reject")}
                  >
                    {busy === `${r.id}:reject` ? <Loader2 className="size-3.5 animate-spin" /> : "Reject"}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
