/** Order domain types. Prices are integers in Rupees. */

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "in_production"
  | "quality_check"
  | "dispatched"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";

export type CreditTerm = "net_15" | "net_30" | "net_60" | "prepaid";

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  organizationId: string;
  reference: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  creditTerm: CreditTerm;
  items: OrderItem[];
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  poNumber?: string;
  createdAt: string;
  expectedDelivery?: string;
}
