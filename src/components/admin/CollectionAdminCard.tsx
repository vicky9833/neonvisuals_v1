import Link from "next/link";
import { formatCurrency } from "@/lib/utils/format";
import type { CollectionAdminData } from "@/lib/admin/products";

export function CollectionAdminCard({ data }: { data: CollectionAdminData }) {
  return (
    <div className="flex flex-col rounded-xl border border-[#EDE9E3] bg-white p-5 shadow-sm">
      <div className="flex items-baseline gap-2">
        <span className="font-heading text-lg font-bold text-gold">{data.code}</span>
        <h3 className="font-heading text-base font-semibold text-navy">{data.name}</h3>
      </div>
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-[#9CA3AF]">Products</dt>
          <dd className="font-numbers text-navy">
            {data.productCount} · {data.withImages} with images
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[#9CA3AF]">ASP range</dt>
          <dd className="font-numbers text-navy">
            {data.aspMin != null && data.aspMax != null
              ? `${formatCurrency(data.aspMin)}-${formatCurrency(data.aspMax)}`
              : "-"}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[#9CA3AF]">Avg margin</dt>
          <dd className="font-numbers text-navy">{data.avgMargin}%</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-3 border-t border-border pt-3 text-sm">
        <Link
          href={`/ops/products?collection=${data.code}`}
          className="font-medium text-gold hover:underline"
        >
          View Products
        </Link>
        <a
          href={`/collections/${data.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[#6B7280] hover:text-navy"
        >
          View on Site
        </a>
      </div>
    </div>
  );
}
