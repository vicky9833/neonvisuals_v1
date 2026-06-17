/** Quote domain types. Quote-based selling (no shopping cart). */

export type QuoteStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "approved"
  | "rejected"
  | "expired";

export interface QuoteItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  /** Unit price in Rupees. */
  unitPrice: number;
}

export interface Quote {
  id: string;
  organizationId: string;
  reference: string;
  status: QuoteStatus;
  items: QuoteItem[];
  /** Subtotal in Rupees before GST. */
  subtotal: number;
  gstRate: number;
  /** GST amount in Rupees. */
  gstAmount: number;
  /** Total in Rupees including GST. */
  total: number;
  notes?: string;
  createdAt: string;
  expiresAt?: string;
}
