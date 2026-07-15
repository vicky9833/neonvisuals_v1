import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Razorpay redirects the customer's browser here after a payment-link payment.
 * Actual payment recording happens reliably via the webhook; this is UX only -
 * we forward to a public success page. PUBLIC (no auth).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const invoice = searchParams.get("invoice") ?? "";
    const status =
      searchParams.get("razorpay_payment_link_status") ?? "paid";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const target = new URL("/payment-status", appUrl);
    if (invoice) target.searchParams.set("invoice", invoice);
    target.searchParams.set("status", status);
    return NextResponse.redirect(target);
  } catch (err) {
    console.error("[payments/callback]", err);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    return NextResponse.redirect(new URL("/payment-status", appUrl));
  }
}
