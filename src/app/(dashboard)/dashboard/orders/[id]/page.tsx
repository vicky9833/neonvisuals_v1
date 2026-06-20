import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProfile } from "@/lib/auth";
import { SetPageTitle } from "@/components/dashboard/DashboardProvider";
import { ClientOrderDetail } from "@/components/orders/ClientOrderDetail";
import { getOrder, toClientOrder } from "@/lib/engines/order";

export const metadata: Metadata = { title: "Order Detail" };

export const dynamic = "force-dynamic";

export default async function ClientOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  const order = await getOrder(id);

  // Company-scope guard: clients may only view their own company's orders.
  if (!order || !profile?.company_id || order.company_id !== profile.company_id) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <SetPageTitle title="Order Detail" />
      <Link
        href="/dashboard/orders"
        className="inline-flex items-center gap-1 text-sm font-medium text-[#6B7280] hover:text-navy"
      >
        <ArrowLeft className="size-4" /> Back to orders
      </Link>
      <ClientOrderDetail order={toClientOrder(order)} />
    </div>
  );
}
