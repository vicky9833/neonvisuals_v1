"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";
import { Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RecipientInput, OrderEmployeeOption } from "@/lib/engines/order";

interface RecipientUploadProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (recipients: RecipientInput[]) => Promise<void>;
}

/**
 * Adds recipients to an order — either by selecting from the company's
 * employee list or by pasting/uploading a CSV (name, email, department,
 * personalisation_name, personalisation_message).
 */
export function RecipientUpload({
  orderId,
  open,
  onOpenChange,
  onAdd,
}: RecipientUploadProps) {
  const [employees, setEmployees] = useState<OrderEmployeeOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setCsv("");
    setError(null);
    fetch(`/api/orders/${orderId}/employees`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.data) setEmployees(body.data as OrderEmployeeOption[]);
      })
      .catch(() => setEmployees([]));
  }, [open, orderId]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submitFromEmployees() {
    const recipients: RecipientInput[] = employees
      .filter((e) => selected.has(e.id))
      .map((e) => ({
        employeeId: e.id,
        recipientName: e.name,
        recipientEmail: e.email ?? undefined,
        recipientDepartment: e.department ?? undefined,
        personalisationName: e.name,
      }));
    await run(recipients);
  }

  function parseCsv(): RecipientInput[] {
    const result = Papa.parse<Record<string, string>>(csv.trim(), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
    });
    return (result.data ?? [])
      .map((row) => {
        const name = (row.name ?? row.recipient_name ?? "").trim();
        if (!name) return null;
        return {
          recipientName: name,
          recipientEmail: (row.email ?? "").trim() || undefined,
          recipientDepartment: (row.department ?? "").trim() || undefined,
          personalisationName:
            (row.personalisation_name ?? "").trim() || name,
          personalisationMessage:
            (row.personalisation_message ?? row.message ?? "").trim() ||
            undefined,
        } as RecipientInput;
      })
      .filter((r): r is RecipientInput => r !== null);
  }

  async function submitFromCsv() {
    const recipients = parseCsv();
    if (recipients.length === 0) {
      setError("No valid rows found. Include a 'name' column.");
      return;
    }
    await run(recipients);
  }

  async function run(recipients: RecipientInput[]) {
    if (recipients.length === 0) {
      setError("Select at least one recipient.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onAdd(recipients);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add recipients.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Recipients</DialogTitle>
          <DialogDescription>
            Assign employees to this order, or upload a recipient list.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="employees">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="employees">
              <Users className="mr-1.5 size-4" /> From Employees
            </TabsTrigger>
            <TabsTrigger value="csv">
              <Upload className="mr-1.5 size-4" /> Paste CSV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="mt-4">
            {employees.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#9CA3AF]">
                No active employees found for this company.
              </p>
            ) : (
              <ScrollArea className="h-64 rounded-card border border-border p-2">
                <ul className="space-y-1">
                  {employees.map((e) => (
                    <li key={e.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-secondary">
                        <Checkbox
                          checked={selected.has(e.id)}
                          onCheckedChange={() => toggle(e.id)}
                        />
                        <span className="flex-1">
                          <span className="block text-sm font-medium text-navy">
                            {e.name}
                          </span>
                          <span className="block text-xs text-[#9CA3AF]">
                            {[e.department, e.email]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <DialogFooter className="mt-4">
              <Button
                onClick={submitFromEmployees}
                disabled={busy || selected.size === 0}
              >
                {busy ? "Adding…" : `Add ${selected.size || ""} Recipient${selected.size === 1 ? "" : "s"}`}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="csv" className="mt-4">
            <div className="space-y-2">
              <Label htmlFor="csv">CSV rows</Label>
              <Textarea
                id="csv"
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
                rows={8}
                placeholder={
                  "name,email,department,personalisation_name,personalisation_message\nPriya Sharma,priya@acme.com,Design,Priya,Welcome to the team!"
                }
                className="font-mono text-xs"
              />
              <p className="text-xs text-[#9CA3AF]">
                First row must be headers. Only{" "}
                <code className="font-mono">name</code> is required.
              </p>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <DialogFooter className="mt-4">
              <Button onClick={submitFromCsv} disabled={busy || !csv.trim()}>
                {busy ? "Adding…" : "Add Recipients"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
