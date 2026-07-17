import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listCompanyQuotes } from "@/lib/engines/quote-request";

export const metadata: Metadata = { title: "My Quotes" };

/** Rupee display (integers stored; Indian numbering). */
function rs(n: number | null): string {
  if (n == null) return "—";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Requested",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
  converted: "Converted",
  cancelled: "Cancelled",
};

export default async function QuotesPage() {
  let quotes: Awaited<ReturnType<typeof listCompanyQuotes>> = [];
  try {
    const supabase = await createClient();
    quotes = await listCompanyQuotes(supabase); // RLS-scoped: own company only
  } catch {
    quotes = [];
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-bold text-navy">My Quotes</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Quotes your team has requested for gifting occasions.
        </p>
      </header>

      {quotes.length === 0 ? (
        <div className="rounded-xl border border-[#E5E2DC] bg-[#F5F0E8] px-6 py-12 text-center">
          <FileText className="mx-auto size-8 text-[#9CA3AF]" />
          <p className="mt-3 text-sm font-medium text-navy">No quotes yet</p>
          <p className="mt-1 text-xs text-[#6B7280]">
            Request a quote from the Gift Builder or an occasion to see it here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E5E2DC] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F0E8] text-left text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="px-4 py-3 font-semibold">Quote</th>
                <th className="px-4 py-3 font-semibold">Occasion</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th>
                <th className="px-4 py-3 font-semibold">Requested</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDE9E3]">
              {quotes.map((q) => (
                <tr key={q.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3 font-medium text-navy">{q.quote_number ?? q.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{q.occasion ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-navy">
                      {STATUS_LABEL[q.status] ?? q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-navy">{rs(q.final_total ?? q.total_amount)}</td>
                  <td className="px-4 py-3 text-[#6B7280]">
                    {new Date(q.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
