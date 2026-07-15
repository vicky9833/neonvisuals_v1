import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { CollectionAdminCard } from "@/components/admin/CollectionAdminCard";
import { getCollectionAdminData } from "@/lib/admin/products";

export const metadata: Metadata = { title: "Collections" };

export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage() {
  const collections = await getCollectionAdminData();
  return (
    <div className="space-y-8">
      <PageHeader
        title="Collections"
        description="All collections with product counts, pricing ranges, and margins."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c) => (
          <CollectionAdminCard key={c.id} data={c} />
        ))}
      </div>
    </div>
  );
}
