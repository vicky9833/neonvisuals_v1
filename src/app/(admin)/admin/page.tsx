import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";

export const metadata: Metadata = { title: "Admin" };

export default function AdminOverviewPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Admin" description="Internal operations overview." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open leads" value="—" />
        <StatCard label="Active orders" value="—" />
        <StatCard label="Clients" value="—" />
        <StatCard label="Revenue (MTD)" value="—" />
      </div>
    </div>
  );
}
