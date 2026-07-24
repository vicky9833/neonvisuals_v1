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

type LineSource = "catalogue" | "custom" | "charge";

interface LineDraft {
  key: string;
  source: LineSource;
  sku: string;
  name: string;
  quantity: number;
  /** Rupees; manual on every line. */
  unitPrice?: number;
  gstRate?: number;
  hsn?: string;
  uqc?: string;
  notes?: string;
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

const GST_RATE_OPTIONS = [0, 0.25, 3, 5, 12, 18, 28] as const;
const UQC_OPTIONS = ["PCS", "BOX", "SET", "KGS", "NOS", "PKT", "DOZ"] as const;

let __seq = 0;
const nextKey = () => `oline-${Date.now()}-${(__seq += 1)}`;

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

  // Custom / charge entry drafts.
  const emptyCustom = { name: "", sku: "", quantity: 1, unitPrice: "" as number | "", gstRate: 18 as number | "", hsn: "", uqc: "" as (typeof UQC_OPTIONS)[number] | "", notes: "" };
  const [customOpen, setCustomOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState(emptyCustom);
  const [customErr, setCustomErr] = useState("");
  const emptyCharge = { name: "", amount: "" as number | "", gstRate: 18 as number | "", hsn: "" };
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeDraft, setChargeDraft] = useState(emptyCharge);
  const [chargeErr, setChargeErr] = useState("");

  const productMap = useMemo(() => new Map(products.map((p) => [p.sku, p])), [products]);

  function addCatalogue() {
    if (!addSku || lines.some((l) => l.source === "catalogue" && l.sku === addSku)) return;
    const p = productMap.get(addSku);
    setLines((prev) => [
      ...prev,
      { key: nextKey(), source: "catalogue", sku: addSku, name: p?.name ?? addSku, quantity: 1, gstRate: 18 },
    ]);
    setAddSku("");
  }

  function commitCustom() {
    const name = customDraft.name.trim();
    const unitPrice = Number(customDraft.unitPrice);
    const quantity = Number(customDraft.quantity);
    if (!name) return setCustomErr("Description is required.");
    if (!(unitPrice > 0)) return setCustomErr("Unit price must be greater than 0.");
    if (!(quantity > 0)) return setCustomErr("Quantity must be greater than 0.");
    if (customDraft.hsn && !/^\d{4,8}$/.test(customDraft.hsn)) return setCustomErr("HSN must be 4-8 digits.");
    const n = lines.filter((l) => l.source === "custom").length + 1;
    setLines((prev) => [
      ...prev,
      {
        key: nextKey(),
        source: "custom",
        sku: customDraft.sku.trim() || `CUSTOM-${n}`,
        name,
        quantity,
        unitPrice,
        gstRate: customDraft.gstRate === "" ? undefined : Number(customDraft.gstRate),
        hsn: customDraft.hsn || undefined,
        uqc: customDraft.uqc || undefined,
        notes: customDraft.notes || undefined,
      },
    ]);
    setCustomDraft(emptyCustom);
    setCustomErr("");
    setCustomOpen(false);
  }

  function commitCharge() {
    const name = chargeDraft.name.trim();
    const amount = Number(chargeDraft.amount);
    if (!name) return setChargeErr("Description is required.");
    if (!(amount > 0)) return setChargeErr("Amount must be greater than 0.");
    if (chargeDraft.hsn && !/^\d{4,8}$/.test(chargeDraft.hsn)) return setChargeErr("HSN must be 4-8 digits.");
    const n = lines.filter((l) => l.source === "charge").length + 1;
    setLines((prev) => [
      ...prev,
      {
        key: nextKey(),
        source: "charge",
        sku: `CHARGE-${n}`,
        name,
        quantity: 1,
        unitPrice: amount,
        gstRate: chargeDraft.gstRate === "" ? undefined : Number(chargeDraft.gstRate),
        hsn: chargeDraft.hsn || undefined,
      },
    ]);
    setChargeDraft(emptyCharge);
    setChargeErr("");
    setChargeOpen(false);
  }

  function updateQty(key: string, qty: number) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, qty) } : l)));
  }
  function updatePrice(key: string, unitPrice: number | undefined) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, unitPrice } : l)));
  }
  function updateGst(key: string, gstRate: number | undefined) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, gstRate } : l)));
  }
  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  const lineErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    for (const l of lines) {
      const problems: string[] = [];
      if (l.source !== "catalogue" && !l.name.trim()) problems.push("description");
      if (l.unitPrice == null || !(l.unitPrice > 0)) problems.push("unit price");
      if (l.source !== "charge" && !(l.quantity > 0)) problems.push("quantity");
      if (problems.length > 0) errs[l.key] = `Missing/invalid: ${problems.join(", ")}`;
    }
    return errs;
  }, [lines]);
  const hasLineErrors = Object.keys(lineErrors).length > 0;

  function toLinePayload(l: LineDraft) {
    const line: Record<string, unknown> = { sku: l.sku, quantity: l.quantity, source: l.source, name: l.name, unitPrice: l.unitPrice };
    if (l.gstRate != null) line.gstRate = l.gstRate;
    if (l.hsn) line.hsn = l.hsn;
    if (l.uqc) line.uqc = l.uqc;
    if (l.notes) line.notes = l.notes;
    return line;
  }

  async function submit() {
    setError(null);
    if (!companyId) return setError("Select a company.");
    if (lines.length === 0) return setError("Add at least one product.");
    if (hasLineErrors) return setError("Fix the highlighted lines (a unit price is required on every line).");

    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          occasionLabel: occasionLabel || undefined,
          occasionType: occasionType || undefined,
          products: lines.map(toLinePayload),
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
      router.push(`/ops/orders/${body.data.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create order.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls = "h-9 w-full rounded-md border border-border px-2 text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Order</DialogTitle>
          <DialogDescription>
            Enter the unit price on every line. Catalogue, custom and charge lines are all priced
            manually. Add recipients after creating the order.
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
              <Input id="occasionLabel" value={occasionLabel} onChange={(e) => setOccasionLabel(e.target.value)} placeholder="e.g. Diwali 2026" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="occasionType">Occasion type</Label>
              <Input id="occasionType" value={occasionType} onChange={(e) => setOccasionType(e.target.value)} placeholder="e.g. festive" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="kitCount">Kit count *</Label>
              <Input id="kitCount" type="number" min={1} value={kitCount} onChange={(e) => setKitCount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Packaging</Label>
              <Select value={packagingTier} onValueChange={setPackagingTier}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PACKAGING.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Personalisation</Label>
              <Select value={personalisation} onValueChange={setPersonalisation}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERSONALISATION.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
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
                  <SelectValue placeholder="Choose a catalogue product to add" />
                </SelectTrigger>
                <SelectContent>
                  {products
                    .filter((p) => !lines.some((l) => l.source === "catalogue" && l.sku === p.sku))
                    .map((p) => (
                      <SelectItem key={p.sku} value={p.sku}>{p.sku} - {p.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={addCatalogue}><Plus className="size-4" /></Button>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setCustomDraft(emptyCustom); setCustomErr(""); setCustomOpen(true); }}>+ Custom item</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => { setChargeDraft(emptyCharge); setChargeErr(""); setChargeOpen(true); }}>+ Charge</Button>
            </div>

            {customOpen && (
              <div className="space-y-2 rounded-md border border-gold/50 bg-secondary/40 p-3">
                <p className="text-xs font-semibold uppercase text-[#888]">Custom item</p>
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputCls} placeholder="Description *" value={customDraft.name} onChange={(e) => setCustomDraft((d) => ({ ...d, name: e.target.value }))} />
                  <input className={inputCls} placeholder="Code / SKU (optional)" value={customDraft.sku} onChange={(e) => setCustomDraft((d) => ({ ...d, sku: e.target.value }))} />
                  <input className={inputCls} type="number" min={1} placeholder="Quantity *" value={customDraft.quantity} onChange={(e) => setCustomDraft((d) => ({ ...d, quantity: Math.max(1, Number(e.target.value) || 1) }))} />
                  <input className={inputCls} type="number" min={0} placeholder="Unit price (Rs) *" value={customDraft.unitPrice} onChange={(e) => setCustomDraft((d) => ({ ...d, unitPrice: e.target.value === "" ? "" : Number(e.target.value) }))} />
                  <select className={inputCls} value={customDraft.gstRate} onChange={(e) => setCustomDraft((d) => ({ ...d, gstRate: e.target.value === "" ? "" : Number(e.target.value) }))}>
                    <option value="">GST %</option>
                    {GST_RATE_OPTIONS.map((r) => <option key={r} value={r}>{r}%</option>)}
                  </select>
                  <input className={inputCls} placeholder="HSN (optional, 4-8 digits)" value={customDraft.hsn} onChange={(e) => setCustomDraft((d) => ({ ...d, hsn: e.target.value }))} />
                  <select className={inputCls} value={customDraft.uqc} onChange={(e) => setCustomDraft((d) => ({ ...d, uqc: e.target.value as (typeof UQC_OPTIONS)[number] | "" }))}>
                    <option value="">UQC (optional)</option>
                    {UQC_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input className={inputCls} placeholder="Notes (optional)" value={customDraft.notes} onChange={(e) => setCustomDraft((d) => ({ ...d, notes: e.target.value }))} />
                </div>
                {customErr && <p className="text-xs text-red-600">{customErr}</p>}
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={commitCustom}>Add item</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setCustomOpen(false); setCustomErr(""); }}>Cancel</Button>
                </div>
              </div>
            )}

            {chargeOpen && (
              <div className="space-y-2 rounded-md border border-gold/50 bg-secondary/40 p-3">
                <p className="text-xs font-semibold uppercase text-[#888]">Charge (freight / packing / design)</p>
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputCls} placeholder="Description *" value={chargeDraft.name} onChange={(e) => setChargeDraft((d) => ({ ...d, name: e.target.value }))} />
                  <input className={inputCls} type="number" min={0} placeholder="Amount (Rs) *" value={chargeDraft.amount} onChange={(e) => setChargeDraft((d) => ({ ...d, amount: e.target.value === "" ? "" : Number(e.target.value) }))} />
                  <select className={inputCls} value={chargeDraft.gstRate} onChange={(e) => setChargeDraft((d) => ({ ...d, gstRate: e.target.value === "" ? "" : Number(e.target.value) }))}>
                    <option value="">GST %</option>
                    {GST_RATE_OPTIONS.map((r) => <option key={r} value={r}>{r}%</option>)}
                  </select>
                  <input className={inputCls} placeholder="HSN (optional, 4-8 digits)" value={chargeDraft.hsn} onChange={(e) => setChargeDraft((d) => ({ ...d, hsn: e.target.value }))} />
                </div>
                {chargeErr && <p className="text-xs text-red-600">{chargeErr}</p>}
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={commitCharge}>Add charge</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setChargeOpen(false); setChargeErr(""); }}>Cancel</Button>
                </div>
              </div>
            )}

            {lines.length > 0 && (
              <ul className="divide-y divide-border rounded-card border border-border">
                {lines.map((l) => (
                  <li key={l.key} className="px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-[140px] flex-1 text-navy">
                        {l.source !== "catalogue" && (
                          <span className="mr-1 rounded bg-gold/15 px-1 py-0.5 text-[10px] font-bold uppercase text-gold">
                            {l.source}
                          </span>
                        )}
                        <span className="font-medium">{l.name}</span>{" "}
                        <span className="text-[#6B7280]">({l.sku || "-"})</span>
                      </span>
                      <label className="flex items-center gap-1 text-xs text-[#6B7280]">
                        Rs
                        <Input type="number" min={0} placeholder="price *" value={l.unitPrice ?? ""} onChange={(e) => updatePrice(l.key, e.target.value === "" ? undefined : Number(e.target.value))} className="h-8 w-24" />
                      </label>
                      <select value={l.gstRate ?? ""} onChange={(e) => updateGst(l.key, e.target.value === "" ? undefined : Number(e.target.value))} className="h-8 w-20 rounded-md border border-border px-1 text-xs" title="GST %">
                        <option value="">GST</option>
                        {GST_RATE_OPTIONS.map((r) => <option key={r} value={r}>{r}%</option>)}
                      </select>
                      {l.source !== "charge" ? (
                        <Input type="number" min={1} value={l.quantity} onChange={(e) => updateQty(l.key, Number(e.target.value))} className="h-8 w-16" title="Qty" />
                      ) : (
                        <span className="w-16 text-center text-xs text-[#9CA3AF]">qty 1</span>
                      )}
                      <button type="button" onClick={() => removeLine(l.key)} className="text-[#9CA3AF] hover:text-red-600" aria-label="Remove line">
                        <X className="size-4" />
                      </button>
                    </div>
                    {lineErrors[l.key] && <p className="mt-1 text-xs text-red-600">{lineErrors[l.key]}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="instructions">Special instructions</Label>
            <Textarea id="instructions" value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} rows={2} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button onClick={submit} disabled={busy || hasLineErrors}>{busy ? "Creating…" : "Create Order"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
