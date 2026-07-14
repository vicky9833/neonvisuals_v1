/**
 * Quote PDF generator - @react-pdf/renderer. Server-side only.
 * Brand voice: "Investment" never "Price/Cost". Helvetica (built-in) - uses
 * "Rs." for amounts since the ₹ glyph is not in the base Helvetica font.
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { Quote } from "@/lib/engines/quote";
import { createAdminClient } from "@/lib/supabase/admin";
import { setQuotePdfUrl } from "@/lib/engines/quote";

const NAVY = "#1A1A2E";
const GOLD = "#C4A35A";
const BODY = "#333333";
const BORDER = "#EDE9E3";
const ALT = "#FAFAF8";

const PACKAGING_LABEL: Record<string, string> = {
  essential: "Essential",
  standard: "Standard",
  premium: "Premium",
  flagship: "Flagship",
};
const PERSONALISATION_LABEL: Record<string, string> = {
  name_only: "Name Only",
  name_occasion: "Name + Occasion",
  full_personal: "Full Personal Touch",
};

function rs(n: number): string {
  return `Rs. ${Math.round(n).toLocaleString("en-IN")}`;
}

const s = StyleSheet.create({
  page: { paddingHorizontal: 40, paddingVertical: 36, fontSize: 9, color: BODY, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { fontSize: 18, fontFamily: "Helvetica-Bold", color: NAVY, letterSpacing: 1 },
  tagline: { fontSize: 8, color: GOLD, marginTop: 2 },
  quoteMeta: { textAlign: "right", fontSize: 9, color: BODY },
  title: { textAlign: "center", fontSize: 22, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 18, letterSpacing: 2 },
  rule: { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 12 },
  sectionLabel: { fontSize: 8, color: GOLD, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 4 },
  twoCol: { flexDirection: "row", justifyContent: "space-between" },
  col: { width: "48%" },
  bold: { fontFamily: "Helvetica-Bold", color: NAVY },
  valid: { color: GOLD, fontFamily: "Helvetica-Bold" },
  // table
  th: { flexDirection: "row", backgroundColor: NAVY, color: "#FFFFFF", paddingVertical: 6, paddingHorizontal: 6, fontSize: 8, fontFamily: "Helvetica-Bold" },
  tr: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: BORDER },
  cNum: { width: "6%" },
  cSku: { width: "16%" },
  cName: { width: "40%" },
  cUnit: { width: "16%", textAlign: "right" },
  cQty: { width: "10%", textAlign: "right" },
  cTotal: { width: "12%", textAlign: "right" },
  // summary
  sumRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 3 },
  sumLabel: { width: 160, textAlign: "right", marginRight: 12, color: BODY },
  sumValue: { width: 90, textAlign: "right" },
  grand: { fontSize: 13, fontFamily: "Helvetica-Bold", color: NAVY },
  perKit: { color: GOLD, fontFamily: "Helvetica-Bold" },
  terms: { fontSize: 7.5, color: "#666666", marginTop: 3, lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 8, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: "#888888" },
});

function QuoteDocument({ quote }: { quote: Quote }) {
  const p = quote.pricing;
  const created = new Date(quote.created_at || Date.now()).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const validUntil = quote.valid_until
    ? new Date(quote.valid_until).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "-";

  return (
    <Document title={quote.quote_number} author="Neon Visuals">
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.logo}>NEON VISUALS</Text>
            <Text style={s.tagline}>Crafted with Intention. Remembered with Pride.</Text>
          </View>
          <View style={s.quoteMeta}>
            <Text style={s.bold}>{quote.quote_number}</Text>
            <Text>Date: {created}</Text>
          </View>
        </View>

        <Text style={s.title}>QUOTATION</Text>

        <View style={s.rule} />

        {/* Client + summary */}
        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.sectionLabel}>Prepared for</Text>
            <Text style={s.bold}>{quote.client_name}</Text>
            <Text>{quote.client_company}</Text>
            <Text>{quote.client_email}</Text>
            <Text>{quote.client_phone}</Text>
            <Text style={[s.valid, { marginTop: 6 }]}>Valid until: {validUntil}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.sectionLabel}>Kit Summary</Text>
            <Text>Occasion: {quote.occasion || "-"}</Text>
            <Text>Kit Quantity: {quote.kit_count}</Text>
            <Text>Packaging: {PACKAGING_LABEL[quote.packaging_tier] ?? quote.packaging_tier}</Text>
            <Text>
              Personalisation: {PERSONALISATION_LABEL[quote.personalisation_level] ?? quote.personalisation_level}
            </Text>
          </View>
        </View>

        <View style={s.rule} />

        {/* Line items */}
        <View style={s.th}>
          <Text style={s.cNum}>#</Text>
          <Text style={s.cSku}>SKU</Text>
          <Text style={s.cName}>Product</Text>
          <Text style={s.cUnit}>Unit Investment</Text>
          <Text style={s.cQty}>Qty</Text>
          <Text style={s.cTotal}>Line Total</Text>
        </View>
        {p.lineItems?.map((li, i) => (
          <View key={li.sku} style={[s.tr, i % 2 === 1 ? { backgroundColor: ALT } : {}]}>
            <Text style={s.cNum}>{i + 1}</Text>
            <Text style={s.cSku}>{li.sku}</Text>
            <Text style={s.cName}>{li.productName}</Text>
            <Text style={s.cUnit}>{rs(li.unitPrice)}</Text>
            <Text style={s.cQty}>{li.quantity}</Text>
            <Text style={s.cTotal}>{rs(li.lineTotal)}</Text>
          </View>
        ))}

        {/* Summary */}
        <View style={{ marginTop: 12 }}>
          <SummaryRow label="Subtotal (products)" value={rs(p.subtotal)} />
          <SummaryRow label={`Packaging (${PACKAGING_LABEL[quote.packaging_tier]} x ${quote.kit_count})`} value={rs(p.packagingTotal)} />
          {p.personalisationTotal > 0 ? (
            <SummaryRow label="Personalisation Premium" value={rs(p.personalisationTotal)} />
          ) : null}
          {p.resumeIntelligenceTotal > 0 ? (
            <SummaryRow label="Resume-Intelligence" value={rs(p.resumeIntelligenceTotal)} />
          ) : null}
          {p.rushSurchargeAmount > 0 ? (
            <SummaryRow label={`Rush Surcharge (${p.rushSurchargePercent}%)`} value={rs(p.rushSurchargeAmount)} />
          ) : null}
          {quote.discount_amount > 0 ? (
            <SummaryRow
              label={`Discount${quote.discount_percent ? ` (${quote.discount_percent}%)` : ""}`}
              value={`- ${rs(quote.discount_amount)}`}
            />
          ) : null}

          <View style={[s.rule, { width: 262, marginLeft: "auto" }]} />
          <View style={s.sumRow}>
            <Text style={[s.sumLabel, s.grand]}>GRAND TOTAL</Text>
            <Text style={[s.sumValue, s.grand]}>{rs(quote.final_total)}</Text>
          </View>
          <View style={s.sumRow}>
            <Text style={[s.sumLabel, s.perKit]}>Per Kit Investment</Text>
            <Text style={[s.sumValue, s.perKit]}>{rs(quote.per_kit_investment)}</Text>
          </View>
        </View>

        {/* Terms */}
        <View style={{ marginTop: 18 }}>
          <Text style={s.sectionLabel}>Terms</Text>
          <Text style={s.terms}>1. This quote is valid for {quote.validity_days} days from the date above.</Text>
          <Text style={s.terms}>2. 50% advance required to begin production. Balance before dispatch.</Text>
          <Text style={s.terms}>3. Lead time: 7-14 working days from advance payment and name list receipt.</Text>
          <Text style={s.terms}>4. Personalisation requires verified name list in CSV/Excel format.</Text>
          <Text style={s.terms}>5. 100% QC with photo documentation before dispatch.</Text>
          <Text style={s.terms}>6. Prices inclusive of GST. Shipping additional for pan-India delivery.</Text>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text>Neon Visuals - Crafted with Intention. Remembered with Pride. · +91 90194 09590 · contact@neonvisuals.in · neonvisuals.in</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.sumRow}>
      <Text style={s.sumLabel}>{label}</Text>
      <Text style={s.sumValue}>{value}</Text>
    </View>
  );
}

export async function generateQuotePDF(quote: Quote): Promise<Buffer> {
  return renderToBuffer(<QuoteDocument quote={quote} />);
}

/** Generates the PDF, uploads to the private quote-pdfs bucket, stores the path. */
export async function saveQuotePDF(quote: Quote): Promise<string> {
  const buffer = await generateQuotePDF(quote);
  const supa = createAdminClient();
  const path = `${quote.quote_number}.pdf`;
  const { error } = await supa.storage
    .from("quote-pdfs")
    .upload(path, buffer, { contentType: "application/pdf", upsert: true });
  if (error) throw new Error(`PDF upload failed: ${error.message}`);
  const storedUrl = `quote-pdfs/${path}`;
  await setQuotePdfUrl(quote.id, storedUrl);
  return storedUrl;
}
