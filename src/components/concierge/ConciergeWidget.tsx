"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ConciergeRequest {
  id: string;
  subject: string;
  status: string;
  urgency: string;
  created_at: string;
}

/**
 * "Talk to your Gifting Manager" concierge widget (Prompt 7d, §4G). Raises a concierge request and
 * lists the company's existing requests. Attachments upload to /api/concierge/[id]/attachments
 * after creation. SLA copy is display-only ("within 2 working hours").
 */
export function ConciergeWidget() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [urgency, setUrgency] = useState<"low" | "normal" | "high">("normal");
  const [busy, setBusy] = useState(false);
  const [requests, setRequests] = useState<ConciergeRequest[]>([]);

  async function refresh() {
    const res = await fetch("/api/concierge");
    if (res.ok) {
      const j = await res.json().catch(() => ({}));
      setRequests(j?.data?.requests ?? []);
    }
  }
  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/concierge");
      if (!res.ok) return;
      const j = await res.json().catch(() => ({}));
      setRequests(j?.data?.requests ?? []);
    })();
  }, []);

  async function submit() {
    if (!subject.trim() || !body.trim()) { toast.error("Add a subject and a message."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, urgency }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(j.message ?? "Could not send your request."); return; }
      toast.success("Sent. Your gifting manager will reply within 2 working hours.");
      setSubject(""); setBody(""); setUrgency("normal");
      void refresh();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#E5E2DC] bg-[#F5F0E8] p-6">
        <div className="flex items-center gap-2 text-navy">
          <MessageCircle className="size-5 text-gold" />
          <h2 className="font-heading text-lg font-bold">Talk to your Gifting Manager</h2>
        </div>
        <p className="mt-1 text-sm text-[#6B7280]">We reply within 2 working hours.</p>
        <div className="mt-4 space-y-3">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full rounded-md border border-[#E5E2DC] bg-white px-3 py-2 text-sm outline-none focus-visible:border-gold"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="How can we help with your gifting?"
            rows={4}
            className="w-full rounded-md border border-[#E5E2DC] bg-white px-3 py-2 text-sm outline-none focus-visible:border-gold"
          />
          <div className="flex items-center justify-between gap-3">
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as "low" | "normal" | "high")}
              aria-label="Urgency"
              className="h-9 rounded-md border border-[#E5E2DC] bg-white px-2 text-sm capitalize outline-none focus-visible:border-gold"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
            <Button className="bg-navy text-white hover:bg-navy/90" disabled={busy} onClick={submit}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Send to concierge"}
            </Button>
          </div>
        </div>
      </div>

      {requests.length > 0 ? (
        <div className="rounded-xl border border-[#E5E2DC] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E2DC] text-left text-[#6B7280]">
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Urgency</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-[#F0EDE7] last:border-0">
                  <td className="px-4 py-3 text-[#2D2D2D]">{r.subject}</td>
                  <td className="px-4 py-3 capitalize text-[#6B7280]">{r.urgency}</td>
                  <td className="px-4 py-3 capitalize text-[#6B7280]">{r.status.replace(/_/g, " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
