import { formatCurrency } from "@/lib/utils/format";

interface OrderConfirmationEmailProps {
  reference: string;
  total: number;
  recipientName?: string;
}

/** Sent when an order is confirmed. */
export function OrderConfirmationEmail({
  reference,
  total,
  recipientName,
}: OrderConfirmationEmailProps) {
  return (
    <div style={{ fontFamily: "DM Sans, Arial, sans-serif", color: "#2d2d2d" }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", color: "#1a1a2e" }}>
        Order confirmed
      </h1>
      <p>Hi {recipientName ?? "there"},</p>
      <p>
        Your order <strong>{reference}</strong> is confirmed. Total:{" "}
        <strong>{formatCurrency(total)}</strong>. We&apos;ll keep you posted as
        it moves through production.
      </p>
      <p>- The Neon Visuals team</p>
    </div>
  );
}

export default OrderConfirmationEmail;
