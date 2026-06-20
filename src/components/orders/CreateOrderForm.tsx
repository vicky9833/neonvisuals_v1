"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CompanyOption } from "@/lib/engines/order";

interface ProductOption {
  sku: string;
  name: string;
  bucket: string;
}

interface CreateOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: CompanyOption[];
  products: ProductOption[];
}

interface LineDraft {
  sku: string;
  quantity: number;
}

const PACKAGING = [
  { value: "essential", label: "Essential" },
  { value: "standard", label: "Standard" },
  { value: "premium", label: "Premium" },
  { value: "flagship", label: "Flagship" },
];

const PERSONALISATION = [
  { value: "name_only", label: "Name Only" },
  { value: "name_occasion", label: "Name + Occasion" },
  { value: "full_personal", label: "Full Personalisation" },
];

export function CreateOrderForm({
  open,
  onOpenChange,
  companies,
  products,
}: CreateOrderFormProps) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState("");
  const [occasionLabel, setOccasionLabel] = useState("");
  const [occasionType, setOccasionType] = useState("");
  const [kitCount, setKitCount] = useState("1");
  const [packagingTier, setPackagingTier] = useState("standard");
  const [personalisation, setPersonalisation] = useState("name_occasion");
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [addSku, setAddSku] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.sku, p])),
    [products],
  );

  function addLine() {
    if (!addSku || lines.some((l) => l.sku === addSku)) return;
    setLines((prev) => [...prev, { sku: addSku, quantity: 1 }]);
    setAddSku("");
  }

  function updateQty(sku: string, qty: number) {
    setLines((prev) =>
      prev.map((l) => (l.sku === sku ? { ...l, quantity: Math.max(1, qty) } : l)),
    );
  }

  function removeLine(sku: string) {
    setLines((prev) => prev.filter((l) => l.sku !== sku));
  }

  async function submit() {
    setError(null);
    if (!companyId) return setError("Select a company.");
    if (lines.length === 0) return setError("Add at least one product.");

    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          occasionLabel: occasionLabel || undefined,
          occasionType: occasionType || undefined,
          products: lines,
          packagingTier,
          personalisationLevel: personalisation,
          kitCount: Number(kitCount) || 1,
          specialInstructions: specialInstructions || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.message ?? "Failed to create order.");
        return;
      }
      onOpenChange(false);
      router.push(`/admin/orders/${body.data.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create order.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Order</DialogTitle>
          <DialogDescription>
            Pricing is calculated automatically from the catalog. Add recipients
            after creating the order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Company *</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="occasionLabel">Occasion label</Label>
              <Input
                id="occasionLabel"
                value={occasionLabel}
                onChange={(e) => setOccasionLabel(e.target.value)}
                placeholder="e.g. Diwali 2026"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="occasionType">Occasion type</Label>
              <Input
                id="occasionType"
                value={occasionType}
                onChange={(e) => setOccasionType(e.target.value)}
                placeholder="e.g. festive"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="kitCount">Kit count *</Label>
              <Input
                id="kitCount"
                type="number"
                min={1}
                value={kitCount}
                onChange={(e) => setKitCount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Packaging</Label>
              <Select value={packagingTier} onValueChange={setPackagingTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PACKAGING.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Personalisation</Label>
              <Select
                value={personalisation}
                onValueChange={setPersonalisation}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERSONALISATION.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Products */}
          <div className="space-y-2">
            <Label>Products *</Label>
            <div className="flex gap-2">
              <Select value={addSku} onValueChange={setAddSku}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choose a product to add" />
                </SelectTrigger>
                <SelectContent>
                  {products
                    .filter((p) => !lines.some((l) => l.sku === p.sku))
                    .map((p) => (
                      <SelectItem key={p.sku} value={p.sku}>
                        {p.sku} — {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={addLine}>
                <Plus className="size-4" />
              </Button>
            </div>

            {lines.length > 0 && (
              <ul className="divide-y divide-border rounded-card border border-border">
                {lines.map((l) => (
                  <li
                    key={l.sku}
                    className="flex items-center gap-3 px-3 py-2 text-sm"
                  >
                    <span className="flex-1 text-navy">
                      <span className="font-medium">{l.sku}</span>{" "}
                      <span className="text-[#6B7280]">
                        {productMap.get(l.sku)?.name}
                      </span>
                    </span>
                    <Input
                      type="number"
                      min={1}
                      value={l.quantity}
                      onChange={(e) =>
                        updateQty(l.sku, Number(e.target.value))
                      }
                      className="h-8 w-20"
                    />
                    <button
                      type="button"
                      onClick={() => removeLine(l.sku)}
                      className="text-[#9CA3AF] hover:text-red-600"
                      aria-label="Remove product"
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="instructions">Special instructions</Label>
            <Textarea
              id="instructions"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? "Creating…" : "Create Order"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
