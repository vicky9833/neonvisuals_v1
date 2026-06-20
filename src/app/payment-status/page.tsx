import type { Metadata } from "next";
import { PaymentCallback } from "@/components/billing/PaymentCallback";

export const metadata: Metadata = {
  title: "Payment Status",
  robots: { index: false, follow: false },
};

export default async function PaymentStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ invoice?: string; status?: string }>;
}) {
  const { invoice, status } = await searchParams;
  return <PaymentCallback status={status ?? "paid"} invoice={invoice} />;
}
