"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Minimal shape of the Razorpay Checkout.js global we rely on. */
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: { razorpay_payment_id?: string }) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}
type RazorpayInstance = { open: () => void };
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const CHECKOUT_JS = "https://checkout.razorpay.com/v1/checkout.js";

function loadCheckoutJs(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = CHECKOUT_JS;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const PRO_FEATURES = [
  "Unlimited employees & bulk CSV import",
  "Departments, managers & spend approvals",
  "Full festival calendar & automated reminders",
  "Priority concierge support",
];

/**
 * Client plan/upgrade card. For non-Pro orgs it offers "Upgrade to Pro — ₹1,999/yr" and drives the
 * EXISTING /api/billing/checkout + Razorpay Checkout.js flow (no new money path). Test-mode safe:
 * if Razorpay keys are absent the route returns non-200 and we report "not yet available" (no crash).
 * Pro is only ever granted server-side by the signature-verified webhook — never a client claim.
 */
export function UpgradeCard({ isPro, canUpgrade }: { isPro: boolean; canUpgrade: boolean }) {
  const [busy, setBusy] = useState(false);

  if (isPro) {
    return (
      <div className="rounded-xl border border-gold/40 bg-gold/5 p-5 shadow-sm">
        <p className="flex items-center gap-2 font-heading text-lg font-semibold text-navy">
          <Check className="size-5 text-[#2D6A4F]" /> Pro plan active
        </p>
        <p className="mt-1 text-sm text-[#6B7280]">
          Your organisation has full access to Pro features. Thank you for being with Neon Visuals.
        </p>
      </div>
    );
  }

  async function upgrade() {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      if (!res.ok) {
        toast.error(
          "Online upgrade isn't available just yet. Please contact us at contact@neonvisuals.in to move to Pro.",
        );
        return;
      }
      const body = await res.json();
      const handle = body.data as {
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
      };
      const ready = await loadCheckoutJs();
      if (!ready || !window.Razorpay) {
        toast.error("Couldn't load the secure checkout. Please try again in a moment.");
        return;
      }
      const rzp = new window.Razorpay({
        key: handle.keyId,
        amount: handle.amount,
        currency: handle.currency,
        name: "Neon Visuals",
        description: "Neon Visuals Pro — Annual (₹1,999/yr + 18% GST)",
        order_id: handle.orderId,
        handler: () => {
          toast.success("Payment received. Activating your Pro plan…");
          window.location.href = "/payment-status?status=success";
        },
        theme: { color: "#1A1A2E" },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.open();
    } catch {
      toast.error("Something went wrong starting checkout. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gold">
            <Sparkles className="size-4" /> You&apos;re on the Free plan
          </p>
          <h2 className="mt-2 font-heading text-xl font-bold text-navy">
            Upgrade to Pro — ₹1,999
            <span className="text-sm font-medium text-[#6B7280]">/yr + GST</span>
          </h2>
          <ul className="mt-3 space-y-1.5">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-[#4B5563]">
                <Check className="size-4 shrink-0 text-[#2D6A4F]" /> {f}
              </li>
            ))}
          </ul>
        </div>
        {canUpgrade ? (
          <div className="flex flex-col items-end gap-1">
            <Button
              onClick={upgrade}
              disabled={busy}
              className="h-11 rounded-lg bg-navy px-6 text-white hover:bg-navy/90"
            >
              {busy ? "Starting…" : "Upgrade to Pro"}
            </Button>
            <p className="text-xs text-[#6B7280]">₹2,359/yr incl. GST</p>
          </div>
        ) : (
          <p className="max-w-[220px] text-sm text-[#6B7280]">
            Ask an owner, admin, or finance teammate to upgrade your organisation.
          </p>
        )}
      </div>
    </div>
  );
}
