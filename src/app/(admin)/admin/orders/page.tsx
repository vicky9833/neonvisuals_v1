import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { OrderList } from "@/components/orders/OrderList";
import {
  getOrderStats,
  listCompaniesForOrders,
  listOrders,
} from "@/lib/engines/order";
import { PRODUCTS } from "@/lib/catalog";

export const metadata: Metadata = { title: "Order Management" };

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const [{ orders }, stats, companies] = await Promise.all([
    listOrders({ pageSize: 50 }),
    getOrderStats(),
    listCompaniesForOrders(),
  ]);

  const products = PRODUCTS.map((p) => ({
    sku: p.sku,
    name: p.name,
    bucket: p.bucket,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Order Management"
        description="Track gift orders from creation through production, dispatch, and delivery."
      />
      <OrderList
        initialOrders={orders}
        initialStats={stats}
        companies={companies}
        products={products}
      />
    </div>
  );
}
