/**
 * Tax Invoice PDF generator - @react-pdf/renderer. Server-side only.
 * Uses built-in Helvetica and "Rs." (the ₹ glyph isn't in base Helvetica).
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { getInvoice, type Invoice, type InvoiceLineItem } from "@/lib/engines/billing";

const NAVY = "#1A1A2E";
const GOLD = "#C4A35A";
const BODY = "#333333";
const MUTED = "#6B7280";
const BORDER = "#EDE9E3";
const ALT = "#FAFAF8";

/** "Rs. 1,42,957.00" - Indian grouping, two decimals. */
function rs(n: number): string {
  return `Rs. ${Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const TYPE_LABEL: Record<string, string> = {
  advance: "Advance",
  balance: "Balance",
  standard: "Standard",
  proforma: "Proforma",
  credit_note: "Credit Note",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: BODY,
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    textAlign: "center",
    letterSpacing: 1,
  },
  brand: { fontSize: 14, fontFamily: "Helvetica-Bold", color: NAVY },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 10,
  },
  metaRight: { textAlign: "right" },
  metaLabel: { color: MUTED, fontSize: 8 },
  metaValue: { color: NAVY, fontFamily: "Helvetica-Bold", fontSize: 10 },
  divider: { height: 2, backgroundColor: GOLD, marginVertical: 12 },
  partiesRow: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  party: { width: "48%" },
  partyHead: {
    fontSize: 8,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
    textTransform: "uppercase",
  },
  strong: { fontFamily: "Helvetica-Bold", color: NAVY, fontSize: 10 },
  line: { marginBottom: 1.5, lineHeight: 1.3 },
  refBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: ALT,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 8,
    marginTop: 12,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: NAVY,
    color: "#FFFFFF",
    paddingVertical: 5,
    paddingHorizontal: 4,
    marginTop: 14,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  cNum: { width: "6%" },
  cDesc: { width: "40%" },
  cHsn: { width: "14%" },
  cQty: { width: "10%", textAlign: "right" },
  cRate: { width: "15%", textAlign: "right" },
  cAmt: { width: "15%", textAlign: "right" },
  totals: { marginTop: 12, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", width: "55%", justifyContent: "space-between", marginBottom: 2 },
  grandRow: {
    flexDirection: "row",
    width: "55%",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: NAVY,
  },
  grandText: { fontFamily: "Helvetica-Bold", color: NAVY, fontSize: 11 },
  words: {
    marginTop: 10,
    backgroundColor: ALT,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 8,
  },
  dueBox: {
    marginTop: 10,
    backgroundColor: "#FFF7E6",
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 4,
    padding: 8,
  },
  sectionHead: {
    fontSize: 8,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
    marginTop: 12,
    textTransform: "uppercase",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    textAlign: "center",
    color: MUTED,
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
  },
});

function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const items = invoice.line_items as InvoiceLineItem[];
  const isAdvance =
    invoice.invoice_type === "advance" ||
    (invoice.payment_percentage != null && invoice.payment_percentage < 100);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>TAX INVOICE</Text>

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>Neon Visuals</Text>
            <Text style={styles.line}>Crafted with Intention. Remembered with Pride.</Text>
          </View>
          <View style={styles.metaRight}>
            <Text style={styles.metaLabel}>Invoice No.</Text>
            <Text style={styles.metaValue}>{invoice.invoice_number ?? "-"}</Text>
            <Text style={[styles.metaLabel, { marginTop: 4 }]}>Date</Text>
            <Text style={styles.line}>{invoice.invoice_date}</Text>
            <Text style={[styles.metaLabel, { marginTop: 4 }]}>Due Date</Text>
            <Text style={styles.line}>{invoice.due_date}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.partiesRow}>
          <View style={styles.party}>
            <Text style={styles.partyHead}>From</Text>
            <Text style={styles.strong}>{invoice.seller_name}</Text>
            <Text style={styles.line}>{invoice.seller_address}</Text>
            {invoice.seller_gstin ? (
              <Text style={styles.line}>GSTIN: {invoice.seller_gstin}</Text>
            ) : null}
            {invoice.seller_pan ? (
              <Text style={styles.line}>PAN: {invoice.seller_pan}</Text>
            ) : null}
          </View>
          <View style={styles.party}>
            <Text style={styles.partyHead}>Bill To</Text>
            <Text style={styles.strong}>{invoice.buyer_company}</Text>
            <Text style={styles.line}>{invoice.buyer_name}</Text>
            {invoice.buyer_address ? (
              <Text style={styles.line}>{invoice.buyer_address}</Text>
            ) : null}
            {invoice.buyer_gstin ? (
              <Text style={styles.line}>GSTIN: {invoice.buyer_gstin}</Text>
            ) : null}
            {invoice.buyer_email ? (
              <Text style={styles.line}>{invoice.buyer_email}</Text>
            ) : null}
            {invoice.buyer_phone ? (
              <Text style={styles.line}>{invoice.buyer_phone}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.refBox}>
          <Text>
            {invoice.subscription_id ? "Subscription (Pro)" : `Order: ${invoice.order_number ?? "-"}`}
          </Text>
          <Text>Type: {TYPE_LABEL[invoice.invoice_type] ?? invoice.invoice_type}</Text>
          <Text>Place of Supply: {invoice.is_intra_state ? "Karnataka (Intra-state)" : "Inter-state"}</Text>
        </View>

        {/* Line items */}
        <View style={styles.tableHead}>
          <Text style={styles.cNum}>#</Text>
          <Text style={styles.cDesc}>Description</Text>
          <Text style={styles.cHsn}>HSN/SAC</Text>
          <Text style={styles.cQty}>Qty</Text>
          <Text style={styles.cRate}>Rate</Text>
          <Text style={styles.cAmt}>Amount</Text>
        </View>
        {items.map((item, idx) => (
          <View
            key={idx}
            style={[styles.tableRow, idx % 2 === 1 ? { backgroundColor: ALT } : {}]}
          >
            <Text style={styles.cNum}>{idx + 1}</Text>
            <Text style={styles.cDesc}>{item.description}</Text>
            <Text style={styles.cHsn}>{item.hsnSac}</Text>
            <Text style={styles.cQty}>{item.quantity}</Text>
            <Text style={styles.cRate}>{rs(item.unitPrice)}</Text>
            <Text style={styles.cAmt}>{rs(item.total)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{rs(invoice.subtotal)}</Text>
          </View>
          {invoice.is_intra_state ? (
            <>
              <View style={styles.totalRow}>
                <Text>CGST @ {invoice.gst_rate / 2}%</Text>
                <Text>{rs(invoice.cgst_amount)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text>SGST @ {invoice.gst_rate / 2}%</Text>
                <Text>{rs(invoice.sgst_amount)}</Text>
              </View>
            </>
          ) : (
            <View style={styles.totalRow}>
              <Text>IGST @ {invoice.gst_rate}%</Text>
              <Text>{rs(invoice.igst_amount)}</Text>
            </View>
          )}
          {invoice.round_off != null && invoice.round_off !== 0 ? (
            <View style={styles.totalRow}>
              <Text>Round Off</Text>
              <Text>{rs(invoice.round_off)}</Text>
            </View>
          ) : null}
          <View style={styles.grandRow}>
            <Text style={styles.grandText}>Grand Total</Text>
            <Text style={styles.grandText}>{rs(invoice.grand_total)}</Text>
          </View>
        </View>

        <View style={styles.words}>
          <Text style={styles.metaLabel}>Amount in Words</Text>
          <Text style={{ color: NAVY }}>{invoice.amount_in_words ?? ""}</Text>
        </View>

        {isAdvance ? (
          <View style={styles.dueBox}>
            <Text style={{ color: NAVY, fontFamily: "Helvetica-Bold" }}>
              This invoice is for {invoice.payment_percentage ?? 0}% payment.
            </Text>
            <Text style={{ marginTop: 2 }}>Amount Due: {rs(invoice.amount_due)}</Text>
          </View>
        ) : null}

        {invoice.terms ? (
          <>
            <Text style={styles.sectionHead}>Payment Terms</Text>
            <Text style={styles.line}>{invoice.terms}</Text>
          </>
        ) : null}

        <Text style={styles.sectionHead}>Payment Details</Text>
        <Text style={styles.line}>Bank / UPI details shared separately.</Text>
        {invoice.razorpay_payment_link_url ? (
          <Text style={styles.line}>
            Pay online: {invoice.razorpay_payment_link_url}
          </Text>
        ) : null}
        {invoice.notes ? (
          <>
            <Text style={styles.sectionHead}>Notes</Text>
            <Text style={styles.line}>{invoice.notes}</Text>
          </>
        ) : null}

        <View style={styles.footer}>
          <Text>Thank you for choosing Neon Visuals.</Text>
          <Text>
            This is a computer-generated invoice. contact@neonvisuals.in · +91 90194 09590
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateInvoicePDF(invoice: Invoice): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument invoice={invoice} />);
}

/**
 * Generates + uploads the PDF to private storage, stores the path on the row.
 * Reads the invoice via the SERVICE-ROLE client so this works from the no-session
 * webhook/activation path (the request-scoped RLS client would read null there).
 */
export async function saveInvoicePDF(invoiceId: string): Promise<string> {
  const supa = createAdminClient();
  const invoice = await getInvoice(invoiceId, supa);
  if (!invoice) throw new Error("Invoice not found");
  const buffer = await generateInvoicePDF(invoice);

  const path = `invoices/${invoice.invoice_number ?? invoice.id}.pdf`;
  // Reuse the existing private "quote-pdfs" bucket for generated documents.
  const { error } = await supa.storage
    .from("quote-pdfs")
    .upload(path, buffer, { contentType: "application/pdf", upsert: true });
  if (error) throw new Error(`Invoice PDF upload failed: ${error.message}`);

  const stored = `quote-pdfs/${path}`;
  await supa.from("invoices").update({ pdf_url: stored }).eq("id", invoiceId);
  return stored;
}
