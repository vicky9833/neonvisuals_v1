import type { Metadata } from "next";
import { getProfile } from "@/lib/auth";
import { SetPageTitle } from "@/components/dashboard/DashboardProvider";
import { ClientOrderList } from "@/components/orders/ClientOrderList";
import { listOrders, toClientOrder } from "@/lib/engines/order";

export const metadata: Metadata = { title: "Orders" };

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const profile = await getProfile();
  const companyId = profile?.company_id ?? "";

  const { orders } = companyId
    ? await listOrders({ companyId, pageSize: 50 })
    : { orders: [] };
  const clientOrders = orders.map(toClientOrder);

  return (
    <div className="space-y-6">
      <SetPageTitle title="Orders" />
      <header>
        <h1 className="font-heading text-2xl font-bold text-navy">Your Orders</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Track production and delivery of your gifting orders in real time.
        </p>
      </header>
      <ClientOrderList initialOrders={clientOrders} />
    </div>
  );
}
