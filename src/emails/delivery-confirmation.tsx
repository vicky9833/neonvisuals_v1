interface DeliveryConfirmationEmailProps {
  reference: string;
  recipientName?: string;
}

/** Sent when an order is delivered. */
export function DeliveryConfirmationEmail({
  reference,
  recipientName,
}: DeliveryConfirmationEmailProps) {
  return (
    <div style={{ fontFamily: "DM Sans, Arial, sans-serif", color: "#2d2d2d" }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", color: "#1a1a2e" }}>
        Delivered
      </h1>
      <p>Hi {recipientName ?? "there"},</p>
      <p>
        Order <strong>{reference}</strong> has been delivered. We hope the
        unboxing moment lands beautifully.
      </p>
      <p>- The Neon Visuals team</p>
    </div>
  );
}

export default DeliveryConfirmationEmail;
