"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRODUCTS } from "@/lib/catalog";
import { OCCASION_TYPES } from "@/types/gift";
import type { Employee } from "@/types/employee";

const PACKAGING = ["essential", "standard", "premium", "flagship"];
const PERSONALISATION = ["name_only", "name_occasion", "full_personal"];

export function RecordGiftDrawer({
  open,
  onOpenChange,
  defaultEmployeeId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmployeeId?: string;
  onSaved: () => void;
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId ?? "");
  const [sku, setSku] = useState("");
  const [occasion, setOccasion] = useState("onboarding");
  const [giftedDate, setGiftedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [packaging, setPackaging] = useState("standard");
  const [personalisation, setPersonalisation] = useState("name_occasion");
  const [message, setMessage] = useState("");
  const [engraving, setEngraving] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState("delivered");
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmployeeId(defaultEmployeeId ?? "");
    fetch("/api/employees?pageSize=1000&isActive=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.data?.employees) setEmployees(body.data.employees);
      })
      .catch(() => {});
  }, [open, defaultEmployeeId]);

  const product = useMemo(() => PRODUCTS.find((p) => p.sku === sku), [sku]);

  // Duplicate check when employee + product chosen.
  useEffect(() => {
    if (!employeeId || !sku) {
      setDuplicate(null);
      return;
    }
    let active = true;
    fetch("/api/gifts/duplicates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, productSku: sku }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (active && body?.data?.isDuplicate) {
          setDuplicate(body.data.recommendation as string);
        } else if (active) {
          setDuplicate(null);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [employeeId, sku]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!employeeId || !sku || !occasion || !giftedDate) {
      setError("Employee, product, occasion, and date are required.");
      return;
    }
    if (!product) {
      setError("Select a valid product.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/gifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId,
        productSku: product.sku,
        productName: product.name,
        collectionCode: product.bucket,
        occasionType: occasion,
        giftedDate,
        packagingTier: packaging,
        personalisationLevel: personalisation,
        narrativeMessage: message || undefined,
        engravingText: engraving || undefined,
        deliveryStatus,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.message ?? "Could not record gift.");
      return;
    }
    toast.success("Gift recorded");
    setSku("");
    setMessage("");
    setEngraving("");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-[#EDE9E3]">
          <SheetTitle className="font-heading text-xl text-navy">
            Record a Gift
          </SheetTitle>
          <SheetDescription>
            Log gifts sent through or outside the platform to build memory.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-4 p-4">
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                      {e.department ? ` · ${e.department}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Product *</Label>
              <Input
                list="product-options"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="Type a SKU, e.g. NV-A01"
              />
              <datalist id="product-options">
                {PRODUCTS.map((p) => (
                  <option key={p.sku} value={p.sku}>
                    {p.name}
                  </option>
                ))}
              </datalist>
              {product ? (
                <p className="text-xs text-[#6B7280]">
                  {product.name} · Collection {product.bucket}
                </p>
              ) : null}
            </div>

            {duplicate ? (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                {duplicate}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Occasion *</Label>
                <Select value={occasion} onValueChange={setOccasion}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OCCASION_TYPES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Gifted Date *</Label>
                <Input
                  type="date"
                  value={giftedDate}
                  onChange={(e) => setGiftedDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Packaging</Label>
                <Select value={packaging} onValueChange={setPackaging}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PACKAGING.map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Personalisation</Label>
                <Select
                  value={personalisation}
                  onValueChange={setPersonalisation}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERSONALISATION.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Narrative Message</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Engraving Text</Label>
              <Input
                value={engraving}
                onChange={(e) => setEngraving(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Delivery Status</Label>
              <Select value={deliveryStatus} onValueChange={setDeliveryStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["pending", "in_production", "shipped", "delivered", "returned"].map(
                    (s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            {error ? (
              <p className="text-sm font-medium text-destructive">{error}</p>
            ) : null}
          </div>

          <SheetFooter className="border-t border-[#EDE9E3]">
            <Button
              type="submit"
              disabled={saving}
              className="bg-navy text-white hover:bg-navy/90"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Record Gift"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
