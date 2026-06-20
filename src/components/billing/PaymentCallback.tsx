"use client";

import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";

interface PaymentCallbackProps {
  status: string;
  invoice?: string;
}

/** Standalone post-payment success page (linked from the Razorpay callback). */
export function PaymentCallback({ status, invoice }: PaymentCallbackProps) {
  const paid = status === "paid";
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAF8] px-6 text-center">
      <span
        className={`flex size-16 items-center justify-center rounded-2xl ${
          paid ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
        }`}
      >
        {paid ? (
          <CheckCircle2 className="size-8" />
        ) : (
          <Clock className="size-8" />
        )}
      </span>
      <h1 className="font-heading mt-6 text-2xl font-bold text-navy">
        {paid ? "Payment Successful" : "Payment Processing"}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-[#6B7280]">
        {paid
          ? "Thank you. Your payment has been received and your invoice will be updated shortly."
          : "Your payment is being processed. Your invoice will update once confirmed."}
      </p>
      {invoice ? (
        <p className="mt-1 text-xs text-[#9CA3AF]">Reference: {invoice}</p>
      ) : null}
      <div className="mt-6 flex gap-3">
        <Link
          href="/dashboard/billing"
          className="rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
        >
          View Billing
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-navy px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-secondary"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
