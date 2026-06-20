import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ProductTable } from "@/components/admin/ProductTable";
import {
  getProductAdminStats,
  listAdminProducts,
  listBuckets,
} from "@/lib/admin/products";

export const metadata: Metadata = { title: "Product Catalog" };

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [products, stats, buckets] = await Promise.all([
    listAdminProducts(),
    getProductAdminStats(),
    listBuckets(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Product Catalog"
        description="View and edit catalog data. Edits update the database; the public static file is regenerated manually."
      />
      <ProductTable initialProducts={products} stats={stats} buckets={buckets} />
    </div>
  );
}
