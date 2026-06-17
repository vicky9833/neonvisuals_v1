import { formatCurrency } from "@/lib/utils/format";

interface InvoiceEmailProps {
  reference: string;
  total: number;
  recipientName?: string;
}

/** Sent with a GST invoice attachment. */
export function InvoiceEmail({
  reference,
  total,
  recipientName,
}: InvoiceEmailProps) {
  return (
    <div style={{ fontFamily: "DM Sans, Arial, sans-serif", color: "#2d2d2d" }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", color: "#1a1a2e" }}>
        Your invoice
      </h1>
      <p>Hi {recipientName ?? "there"},</p>
      <p>
        Invoice <strong>{reference}</strong> for{" "}
        <strong>{formatCurrency(total)}</strong> (incl. GST) is attached.
      </p>
      <p>— The Neon Visuals team</p>
    </div>
  );
}

export default InvoiceEmail;
