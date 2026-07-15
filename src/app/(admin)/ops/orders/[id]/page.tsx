import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { OrderDetail } from "@/components/orders/OrderDetail";
import { getOrder } from "@/lib/engines/order";
import { isRazorpayConfigured } from "@/lib/services/razorpay";

export const metadata: Metadata = { title: "Order Detail" };

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/ops/orders"
        className="inline-flex items-center gap-1 text-sm font-medium text-[#6B7280] hover:text-navy"
      >
        <ArrowLeft className="size-4" /> Back to orders
      </Link>
      <OrderDetail initialOrder={order} razorpayConfigured={isRazorpayConfigured()} />
    </div>
  );
}
