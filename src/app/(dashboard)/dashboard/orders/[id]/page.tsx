import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProfile } from "@/lib/auth";
import { SetPageTitle } from "@/components/dashboard/DashboardProvider";
import { ClientOrderDetail } from "@/components/orders/ClientOrderDetail";
import { getOrder, toClientOrder } from "@/lib/engines/order";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listProofPhotoRows, signProofUrls } from "@/lib/services/proof-photos";

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

  // Proof photos (Prompt 7c-rest item 3): RLS-scoped rows + short-TTL SIGNED URLs (never public).
  const userClient = await createClient();
  const proofRows = await listProofPhotoRows(userClient, id);
  const proofUrls = proofRows.length
    ? await signProofUrls(createAdminClient(), proofRows.map((r) => r.storage_path))
    : [];

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

      {proofUrls.length > 0 ? (
        <section className="rounded-xl border border-[#E5E2DC] bg-white p-5">
          <h2 className="font-heading text-lg font-bold text-navy">Proof photos</h2>
          <p className="mt-1 text-sm text-[#6B7280]">See your gifts before they ship.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {proofUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={`Proof photo ${i + 1} for order ${order.order_number ?? ""}`}
                className="aspect-square w-full rounded-lg border border-[#E5E2DC] object-cover"
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
