"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/shared/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { ClientDetailData } from "@/lib/admin/clients";

function Empty({ label }: { label: string }) {
  return <p className="py-6 text-sm text-[#9CA3AF]">{label}</p>;
}

export function ClientDetail({ data }: { data: ClientDetailData }) {
  const { company, employees, orders, invoices, gifts, quotes, stats } = data;

  const activity = [
    ...orders.map((o) => ({
      ts: o.created_at,
      text: `Order ${o.order_number ?? ""} · ${o.status.replace("_", " ")}`,
    })),
    ...invoices.map((i) => ({
      ts: i.created_at,
      text: `Invoice ${i.invoice_number ?? ""} · ${i.status}`,
    })),
    ...gifts.map((g) => ({
      ts: g.gifted_date,
      text: `Gift: ${g.product_name}${g.employee_name ? ` → ${g.employee_name}` : ""}`,
    })),
    ...quotes.map((q) => ({
      ts: q.created_at,
      text: `Quote ${q.quote_number ?? ""} · ${q.status}`,
    })),
  ]
    .filter((a) => a.ts)
    .sort((a, b) => b.ts.localeCompare(a.ts))
    .slice(0, 30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-navy">{company.name}</h1>
        <p className="text-sm text-[#6B7280]">
          {[company.industry, company.city].filter(Boolean).join(" · ") || "-"}
          {company.onboarding_completed ? (
            <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
              Active Client
            </span>
          ) : (
            <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              Onboarding
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Orders" value={stats.totalOrders} />
        <StatCard label="Revenue" value={formatCurrency(stats.totalRevenue)} />
        <StatCard label="Avg Order" value={formatCurrency(stats.avgOrderValue)} />
        <StatCard label="Employees" value={stats.employees} />
        <StatCard label="Gifts Sent" value={stats.giftsSent} />
        <StatCard label="Desk Test" value={`${stats.deskTestScore}%`} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="gifts">Gift History</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Info label="Primary contact" value={company.primary_contact_name} />
            <Info label="Email" value={company.primary_contact_email} />
            <Info label="Phone" value={company.primary_contact_phone} />
            <Info label="Website" value={company.website} />
            <Info label="GSTIN" value={company.gstin} />
            <Info label="Employee count" value={company.employee_count} />
            <Info label="Gifting budget" value={company.gifting_budget} />
            <Info label="Address" value={company.address} />
          </div>
          {company.gifting_occasions && company.gifting_occasions.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-[#9CA3AF]">Gifting occasions</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {company.gifting_occasions.map((o) => (
                  <span key={o} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-navy">
                    {o}
                  </span>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="employees" className="mt-4">
          {employees.length === 0 ? (
            <Empty label="No employees registered." />
          ) : (
            <SimpleTable
              head={["Name", "Email", "Department", "Designation"]}
              rows={employees.map((e) => [e.name, e.email ?? "-", e.department ?? "-", e.designation ?? "-"])}
            />
          )}
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          {orders.length === 0 ? (
            <Empty label="No orders yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="hidden sm:table-cell">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link href={`/ops/orders/${o.id}`} className="font-numbers text-navy hover:underline">
                        {o.order_number ?? "-"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{o.status.replace("_", " ")}</TableCell>
                    <TableCell className="font-numbers text-right text-sm">
                      {formatCurrency(Number(o.grand_total ?? 0))}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-[#9CA3AF]">
                      {formatDate(o.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          {quotes.length === 0 ? (
            <Empty label="No quotes matched by company name." />
          ) : (
            <SimpleTable
              head={["Quote #", "Status", "Created"]}
              rows={quotes.map((q) => [q.quote_number ?? "-", q.status, formatDate(q.created_at)])}
            />
          )}
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          {invoices.length === 0 ? (
            <Empty label="No invoices yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-numbers text-navy">{i.invoice_number}</TableCell>
                    <TableCell className="text-sm">{i.status}</TableCell>
                    <TableCell className="font-numbers text-right text-sm">{formatCurrency(i.amount_due)}</TableCell>
                    <TableCell className="font-numbers text-right text-sm">{formatCurrency(i.amount_paid)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="gifts" className="mt-4">
          {gifts.length === 0 ? (
            <Empty label="No gifts recorded." />
          ) : (
            <SimpleTable
              head={["Product", "Recipient", "Occasion", "Date"]}
              rows={gifts.map((g) => [
                g.product_name,
                g.employee_name ?? "-",
                g.occasion_type,
                formatDate(g.gifted_date),
              ])}
            />
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          {activity.length === 0 ? (
            <Empty label="No activity yet." />
          ) : (
            <ol className="space-y-3">
              {activity.map((a, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-gold" />
                  <div>
                    <p className="text-sm text-[#2D2D2D]">{a.text}</p>
                    <p className="text-xs text-[#9CA3AF]">{formatDate(a.ts)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-card border border-border bg-white p-3">
      <p className="text-xs text-[#9CA3AF]">{label}</p>
      <p className="text-sm text-navy">{value || "-"}</p>
    </div>
  );
}

function SimpleTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {head.map((h) => (
            <TableHead key={h}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={i}>
            {row.map((cell, j) => (
              <TableCell key={j} className="text-sm text-[#2D2D2D]">
                {cell}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
