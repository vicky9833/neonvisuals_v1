import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ProductTable } from "@/components/admin/ProductTable";
import {
  getProductAdminStats,
  listAdminProducts,
  listBuckets,
} from "@/lib/admin/products";
import { getAuthContext, authorizePlatform } from "@/lib/authz/context";
import { getCatalogPendingChanges } from "@/lib/admin/catalog-publish";

export const metadata: Metadata = { title: "Product Catalog" };

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [products, stats, buckets, ctx, pending] = await Promise.all([
    listAdminProducts(),
    getProductAdminStats(),
    listBuckets(),
    getAuthContext(),
    getCatalogPendingChanges(),
  ]);

  const canPublish =
    ctx != null && authorizePlatform(ctx, "platform.catalog.publish").effect === "allow";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Product Catalog"
        description="Edit catalog data in the database, then Publish to regenerate the static catalog. Publishing does not change the live site until the generated files are deployed."
      />
      <ProductTable
        initialProducts={products}
        stats={stats}
        buckets={buckets}
        canPublish={canPublish}
        pendingCount={pending.count}
      />
    </div>
  );
}
