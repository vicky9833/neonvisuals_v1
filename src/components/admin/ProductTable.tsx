"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Search, Plus, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { ProductCreateDialog } from "./ProductCreateDialog";

interface ProductTableProps {
  initialProducts: AdminProductRow[];
  stats: ProductAdminStats;
  buckets: BucketOption[];
  canPublish: boolean;
  pendingCount: number;
}

export function ProductTable({
  initialProducts,
  stats,
  buckets,
  canPublish,
  pendingCount,
}: ProductTableProps) {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [collection, setCollection] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, setPending] = useState(pendingCount);
  const [publishing, setPublishing] = useState(false);

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
    const [prodRes, pendRes] = await Promise.all([
      fetch("/api/ops/products"),
      fetch("/api/ops/products/publish"),
    ]);
    if (prodRes.ok) {
      const body = await prodRes.json();
      setProducts(body.data as AdminProductRow[]);
    }
    if (pendRes.ok) {
      const body = await pendRes.json();
      setPending(Number(body.data?.count ?? 0));
    }
  }

  async function publish() {
    setPublishing(true);
    try {
      const res = await fetch("/api/ops/products/publish", { method: "POST" });
      if (res.ok) {
        const body = await res.json();
        setPending(0);
        toast.success(
          `Catalog regenerated (${body.data?.productCount ?? 0} products). Deploy the generated files to go live.`,
        );
      } else if (res.status === 403) {
        toast.error("You do not have permission to publish the catalog.");
      } else {
        toast.error("Publish failed. Please try again.");
      }
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#6B7280]">
          {stats.total} products · {stats.withImages} with images ·{" "}
          {stats.withoutImages} imageless · {stats.withPricing} priced
        </p>
        <div className="flex items-center gap-2">
          {pending > 0 && (
            <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-medium text-[#7C5B00]">
              {pending} pending change{pending === 1 ? "" : "s"}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 size-4" /> Add Product
          </Button>
          {canPublish && (
            <Button size="sm" onClick={publish} disabled={publishing || pending === 0}>
              <UploadCloud className="mr-1.5 size-4" />
              {publishing ? "Publishing…" : "Publish"}
            </Button>
          )}
        </div>
      </div>

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
                    {p.collection_code ?? "-"}
                  </TableCell>
                  <TableCell className="text-center font-numbers text-sm">
                    {p.wow_score ?? "-"}
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

      <ProductCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        buckets={buckets}
        onCreated={(sku) => {
          refresh();
          setSelected(sku);
          setOpen(true);
        }}
      />
    </div>
  );
}
