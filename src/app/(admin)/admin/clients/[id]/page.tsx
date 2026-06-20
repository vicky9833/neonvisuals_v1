import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ClientDetail } from "@/components/admin/ClientDetail";
import { getClientDetail } from "@/lib/admin/clients";

export const metadata: Metadata = { title: "Client" };

export const dynamic = "force-dynamic";

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getClientDetail(id);
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1 text-sm font-medium text-[#6B7280] hover:text-navy"
      >
        <ArrowLeft className="size-4" /> Back to companies
      </Link>
      <ClientDetail data={data} />
    </div>
  );
}
