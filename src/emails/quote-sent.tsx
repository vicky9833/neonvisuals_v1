import { formatCurrency } from "@/lib/utils/format";

interface QuoteSentEmailProps {
  reference: string;
  total: number;
  recipientName?: string;
}

/** Sent when a quote is shared with a client. */
export function QuoteSentEmail({
  reference,
  total,
  recipientName,
}: QuoteSentEmailProps) {
  return (
    <div style={{ fontFamily: "DM Sans, Arial, sans-serif", color: "#2d2d2d" }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", color: "#1a1a2e" }}>
        Your quote is ready
      </h1>
      <p>Hi {recipientName ?? "there"},</p>
      <p>
        Quote <strong>{reference}</strong> is ready for your review. Estimated
        total: <strong>{formatCurrency(total)}</strong> (incl. GST).
      </p>
      <p>— The Neon Visuals team</p>
    </div>
  );
}

export default QuoteSentEmail;
