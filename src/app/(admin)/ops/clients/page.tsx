import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ClientTable } from "@/components/admin/ClientTable";
import { listAdminClients } from "@/lib/admin/clients";
import { formatCurrency } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Client Companies" };

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  const { clients, stats } = await listAdminClients();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Client Companies"
        description={`${stats.totalCompanies} companies · ${stats.totalEmployees} employees · ${formatCurrency(stats.totalRevenue)} total revenue`}
      />
      <ClientTable clients={clients} />
    </div>
  );
}
