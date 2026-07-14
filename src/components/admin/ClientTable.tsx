"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { AdminClientRow } from "@/lib/admin/clients";

export function ClientTable({ clients }: { clients: AdminClientRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      `${c.name} ${c.industry ?? ""} ${c.city ?? ""}`.toLowerCase().includes(q),
    );
  }, [clients, search]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search companies"
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-card border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead className="hidden md:table-cell">Industry</TableHead>
              <TableHead className="hidden lg:table-cell">Size</TableHead>
              <TableHead className="text-right">Employees</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="hidden sm:table-cell">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No companies found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/clients/${c.id}`)}
                >
                  <TableCell className="font-medium text-navy">{c.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-[#6B7280]">
                    {c.industry ?? "-"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-[#6B7280]">
                    {c.employee_count ?? "-"}
                  </TableCell>
                  <TableCell className="font-numbers text-right text-sm">{c.employees}</TableCell>
                  <TableCell className="font-numbers text-right text-sm">{c.orders}</TableCell>
                  <TableCell className="font-numbers text-right text-sm text-navy">
                    {formatCurrency(c.revenue)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-[#9CA3AF]">
                    {formatDate(c.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
