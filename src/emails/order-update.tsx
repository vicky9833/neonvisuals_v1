interface OrderUpdateEmailProps {
  reference: string;
  status: string;
  recipientName?: string;
}

/** Sent when an order's status changes. */
export function OrderUpdateEmail({
  reference,
  status,
  recipientName,
}: OrderUpdateEmailProps) {
  return (
    <div style={{ fontFamily: "DM Sans, Arial, sans-serif", color: "#2d2d2d" }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", color: "#1a1a2e" }}>
        Order update
      </h1>
      <p>Hi {recipientName ?? "there"},</p>
      <p>
        Order <strong>{reference}</strong> is now{" "}
        <strong>{status.replace(/_/g, " ")}</strong>.
      </p>
      <p>— The Neon Visuals team</p>
    </div>
  );
}

export default OrderUpdateEmail;
