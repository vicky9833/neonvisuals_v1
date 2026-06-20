"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/format";
import type {
  AdminProductRow,
  BucketOption,
  ProductAdminStats,
} from "@/lib/admin/products";
import { ProductEditDrawer } from "./ProductEditDrawer";

interface ProductTableProps {
  initialProducts: AdminProductRow[];
  stats: ProductAdminStats;
  buckets: BucketOption[];
}

export function ProductTable({
  initialProducts,
  stats,
  buckets,
}: ProductTableProps) {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [collection, setCollection] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (collection !== "all" && p.collection_code !== collection) return false;
      if (status !== "all" && p.status !== status) return false;
      if (q) {
        const hay = `${p.sku} ${p.name} ${p.tagline ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [products, search, collection, status]);

  async function refresh() {
    const res = await fetch("/api/admin/products");
    if (res.ok) {
      const body = await res.json();
      setProducts(body.data as AdminProductRow[]);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#6B7280]">
        {stats.total} products · {stats.withImages} with images ·{" "}
        {stats.withoutImages} imageless · {stats.withPricing} priced
      </p>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU or name"
            className="pl-9"
          />
        </div>
        <Select value={collection} onValueChange={setCollection}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Collection" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Collections</SelectItem>
            {buckets.map((b) => (
              <SelectItem key={b.id} value={b.code}>
                {b.code} · {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-card border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Collection</TableHead>
              <TableHead className="text-center">WOW</TableHead>
              <TableHead className="hidden sm:table-cell">Images</TableHead>
              <TableHead>Pricing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow
                  key={p.sku}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelected(p.sku);
                    setOpen(true);
                  }}
                >
                  <TableCell>
                    <span className="relative block size-9 overflow-hidden rounded-md bg-secondary">
                      {p.thumbnail_url || p.images[0] ? (
                        <Image
                          src={p.thumbnail_url ?? p.images[0]}
                          alt={p.name}
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell className="font-numbers text-sm font-medium text-navy">
                    {p.sku}
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    <p className="truncate text-sm font-medium text-navy">{p.name}</p>
                    {p.tagline && (
                      <p className="truncate text-xs text-[#9CA3AF]">{p.tagline}</p>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-[#6B7280]">
                    {p.collection_code ?? "—"}
                  </TableCell>
                  <TableCell className="text-center font-numbers text-sm">
                    {p.wow_score ?? "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">
                    {p.images.length > 0 ? (
                      <span className="text-[#6B7280]">{p.images.length} images</span>
                    ) : (
                      <span className="text-red-500">❌ None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {(p.price_single ?? 0) > 0 ? (
                      <span className="font-numbers text-navy">
                        {formatCurrency(Number(p.price_single))}
                      </span>
                    ) : (
                      <span className="text-red-500">❌ Missing</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProductEditDrawer
        sku={selected}
        open={open}
        onOpenChange={setOpen}
        buckets={buckets}
        onSaved={refresh}
      />
    </div>
  );
}
