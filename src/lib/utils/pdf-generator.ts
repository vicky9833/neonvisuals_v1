/**
 * PDF generation for quotes and GST invoices using @react-pdf/renderer.
 * The document components (.tsx) and `renderToBuffer` wiring are built in a
 * dedicated task. This declares the shared data contract.
 */
export interface InvoicePdfData {
  reference: string;
  organizationName: string;
  gstin?: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  issuedAt: string;
}

export async function generateInvoicePdf(
  data: InvoicePdfData,
): Promise<Uint8Array> {
  void data;
  throw new Error("generateInvoicePdf is not implemented yet");
}
