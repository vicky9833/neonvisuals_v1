"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileInput, Plus, Search } from "lucide-react";
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
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type {
  CompanyOption,
  Order,
  OrderStats,
  OrderStatus,
} from "@/lib/engines/order";
import { ORDER_STATUS_META } from "./order-status";
import { CreateOrderForm } from "./CreateOrderForm";
import { FromQuoteDialog } from "./FromQuoteDialog";

interface ProductOption {
  sku: string;
  name: string;
  bucket: string;
}

interface OrderListProps {
  initialOrders: Order[];
  initialStats: OrderStats;
  companies: CompanyOption[];
  products: ProductOption[];
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Statuses" },
  ...Object.entries(ORDER_STATUS_META).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

/** Compact ₹ for the stats bar - ₹4.2L / ₹89K. */
function compactRs(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return formatCurrency(n);
}

const ACTIVE_STATUSES = [
  "confirmed",
  "in_production",
  "quality_check",
  "packed",
  "shipped",
];

export function OrderList({
  initialOrders,
  initialStats,
  companies,
  products,
}: OrderListProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [stats, setStats] = useState<OrderStats>(initialStats);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [companyId, setCompanyId] = useState("all");
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showFromQuote, setShowFromQuote] = useState(false);

  const activeCount = ACTIVE_STATUSES.reduce(
    (sum, s) => sum + (stats.byStatus[s] ?? 0),
    0,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status !== "all") params.set("status", status);
      if (companyId !== "all") params.set("companyId", companyId);
      const res = await fetch(`/api/orders?${params.toString()}`);
      if (res.ok) {
        const body = await res.json();
        setOrders(body.data.orders as Order[]);
      }
    } finally {
      setLoading(false);
    }
  }, [search, status, companyId]);

  // Re-fetch when filters change (debounced for search).
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    fetch("/api/orders/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => body?.data && setStats(body.data as OrderStats))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order # or occasion"
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFromQuote(true)}>
            <FileInput className="mr-1.5 size-4" /> From Quote
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-1.5 size-4" /> New Order
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Total" value={stats.total.toLocaleString("en-IN")} />
        <Stat label="Active" value={activeCount.toLocaleString("en-IN")} />
        <Stat label="This Month" value={stats.thisMonth.toLocaleString("en-IN")} />
        <Stat label="Revenue" value={compactRs(stats.totalRevenue)} accent />
        <Stat label="Avg Order" value={compactRs(stats.avgOrderValue)} accent />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={companyId} onValueChange={setCompanyId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Companies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-card border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Company</TableHead>
              <TableHead className="hidden md:table-cell">Occasion</TableHead>
              <TableHead className="text-right">Kits</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  {loading ? "Loading…" : "No orders found."}
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => {
                const meta = ORDER_STATUS_META[o.status as OrderStatus];
                return (
                  <TableRow
                    key={o.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/admin/orders/${o.id}`)}
                  >
                    <TableCell>
                      <p className="font-numbers font-medium text-navy">
                        {o.order_number ?? "-"}
                      </p>
                      <p className="text-xs text-[#9CA3AF]">
                        {formatDate(o.created_at)}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-navy">
                      {o.company_name ?? "-"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-[#6B7280]">
                      {o.occasion_label ?? o.occasion_type ?? "-"}
                    </TableCell>
                    <TableCell className="font-numbers text-right text-sm">
                      {o.kit_count.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="font-numbers text-right text-sm text-navy">
                      {formatCurrency(Number(o.grand_total ?? 0))}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}
                      >
                        <span className={`size-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CreateOrderForm
        open={showCreate}
        onOpenChange={setShowCreate}
        companies={companies}
        products={products}
      />
      <FromQuoteDialog
        open={showFromQuote}
        onOpenChange={setShowFromQuote}
        companies={companies}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#EDE9E3] bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-[#6B7280]">{label}</p>
      <p
        className={`font-numbers mt-1 text-2xl font-bold ${accent ? "text-gold" : "text-navy"}`}
      >
        {value}
      </p>
    </div>
  );
}
