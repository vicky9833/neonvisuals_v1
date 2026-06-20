"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TEMPLATES = [
  { value: "welcome", label: "Welcome" },
  { value: "quote_sent", label: "Quote Sent" },
  { value: "order_confirmed", label: "Order Confirmed" },
  { value: "order_shipped", label: "Order Shipped" },
  { value: "order_delivered", label: "Order Delivered" },
  { value: "invoice_sent", label: "Invoice Sent" },
  { value: "payment_received", label: "Payment Received" },
  { value: "occasion_reminder", label: "Occasion Reminder" },
  { value: "lead_followup", label: "Lead Follow-up" },
];

export function EmailTestPanel({ configured }: { configured: boolean }) {
  const [template, setTemplate] = useState("welcome");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/emails/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      const body = await res.json();
      setMsg(
        res.ok
          ? "Test email sent to your address."
          : (body?.message ?? "Failed to send test email."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#EDE9E3] bg-white p-5 shadow-sm">
      <h2 className="font-heading mb-1 text-base font-semibold text-navy">
        Send a Test Email
      </h2>
      <p className="mb-3 text-sm text-[#6B7280]">
        {configured
          ? "Sends the selected template to your own email address."
          : "RESEND_API_KEY is not configured — sends will be skipped."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={template} onValueChange={setTemplate}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEMPLATES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={send} disabled={busy}>
          <Send className="mr-1.5 size-4" /> {busy ? "Sending…" : "Send Test"}
        </Button>
        {msg && <span className="text-sm text-[#6B7280]">{msg}</span>}
      </div>
    </div>
  );
}
