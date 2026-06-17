"use client";

import Papa from "papaparse";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GiftRecord } from "@/types/gift";

/** Exports gift history as CSV. Internal pricing columns are NOT included. */
export function GiftExport({ records }: { records: GiftRecord[] }) {
  function exportCsv() {
    const rows = records.map((r) => ({
      gifted_date: r.gifted_date,
      employee: r.employee_name ?? r.employee_id,
      department: r.employee_department ?? "",
      product_sku: r.product_sku,
      product_name: r.product_name,
      collection: r.collection_code ?? "",
      occasion: r.occasion_label ?? r.occasion_type,
      packaging: r.packaging_tier ?? "",
      personalisation: r.personalisation_level ?? "",
      delivery_status: r.delivery_status,
      desk_test: r.desk_test_status,
      reaction: r.recipient_reaction ?? "",
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "neon-visuals-gift-history.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      variant="outline"
      onClick={exportCsv}
      disabled={records.length === 0}
    >
      <Download className="size-4" /> Export CSV
    </Button>
  );
}
