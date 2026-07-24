"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PRODUCTS } from "@/lib/catalog";
import { OCCASIONS } from "@/lib/gift-builder";
import type { PricingResult } from "@/lib/engines/pricing";

type Tier = "essential" | "standard" | "premium" | "flagship";
type Level = "name_only" | "name_occasion" | "full_personal";
type LineSource = "catalogue" | "custom" | "charge";

const GST_RATE_OPTIONS = [0, 0.25, 3, 5, 12, 18, 28] as const;
const UQC_OPTIONS = ["PCS", "BOX", "SET", "KGS", "NOS", "PKT", "DOZ"] as const;

interface SelItem {
  /** Stable client-side key (sku is not unique for custom/charge lines). */
  key: string;
  source: LineSource;
  sku: string;
  name: string;
  quantity: number;
  /** Rupees; set for custom/charge lines. */
  unitPrice?: number;
  gstRate?: number;
  hsn?: string;
  uqc?: string;
  notes?: string;
}

let __lineSeq = 0;
const nextKey = () => `line-${Date.now()}-${(__lineSeq += 1)}`;
interface FormState {
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientPhone: string;
  occasion: string;
  selected: SelItem[];
  kitCount: number;
  packagingTier: Tier;
  personalisation: Level;
  resumeIntelligence: boolean;
  rushOrder: boolean;
  rushDays: number;
  discountPercent: number;
  discountReason: string;
  validityDays: number;
  notes: string;
}

/** A product line as stored on a persisted quote (snake_case from the API). */
interface QuoteProductRow {
  sku: string;
  quantity: number;
  source?: LineSource;
  name?: string;
  unitPrice?: number;
  gstRate?: number;
  hsn?: string;
  uqc?: string;
  notes?: string;
}

/** A persisted quote row as returned by the quotes API (snake_case fields). */
interface QuoteRow {
  id?: string;
  client_name?: string;
  client_company?: string;
  client_email?: string;
  client_phone?: string;
  occasion?: string;
  products?: QuoteProductRow[];
  kit_count?: number;
  packaging_tier?: Tier;
  personalisation_level?: Level;
  resume_intelligence?: boolean;
  rush_order?: boolean;
  rush_days?: number;
  discount_percent?: number;
  validity_days?: number;
  notes?: string;
}

const EMPTY: FormState = {
  clientName: "",
  clientCompany: "",
  clientEmail: "",
  clientPhone: "+91 ",
  occasion: OCCASIONS[0]?.label ?? "Onboarding",
  selected: [],
  kitCount: 25,
  packagingTier: "standard",
  personalisation: "name_occasion",
  resumeIntelligence: false,
  rushOrder: false,
  rushDays: 7,
  discountPercent: 0,
  discountReason: "",
  validityDays: 15,
  notes: "",
};

const rs = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;

/* eslint-disable @typescript-eslint/no-explicit-any */
export function QuotesAdmin() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [search, setSearch] = useState("");
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  // Custom / charge line entry drafts (staff-only, Phase 5A).
  const [customOpen, setCustomOpen] = useState(false);
  const emptyCustom = {
    name: "",
    sku: "",
    quantity: 1,
    unitPrice: "" as number | "",
    gstRate: "" as number | "",
    hsn: "",
    uqc: "" as (typeof UQC_OPTIONS)[number] | "",
    notes: "",
  };
  const [customDraft, setCustomDraft] = useState(emptyCustom);
  const [chargeOpen, setChargeOpen] = useState(false);
  const emptyCharge = { name: "", amount: "" as number | "", gstRate: "" as number | "", hsn: "" };
  const [chargeDraft, setChargeDraft] = useState(emptyCharge);
  const [customErr, setCustomErr] = useState("");
  const [chargeErr, setChargeErr] = useState("");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return PRODUCTS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    ).slice(0, 12);
  }, [search]);

  function addProduct(sku: string, name: string) {
    setForm((f) =>
      f.selected.some((s) => s.source === "catalogue" && s.sku === sku)
        ? f
        : {
            ...f,
            selected: [
              ...f.selected,
              { key: nextKey(), source: "catalogue", sku, name, quantity: f.kitCount },
            ],
          },
    );
  }
  function addLine(line: Omit<SelItem, "key">) {
    setForm((f) => ({ ...f, selected: [...f.selected, { key: nextKey(), ...line }] }));
  }
  function removeLine(key: string) {
    setForm((f) => ({ ...f, selected: f.selected.filter((s) => s.key !== key) }));
  }
  function setQty(key: string, quantity: number) {
    setForm((f) => ({
      ...f,
      selected: f.selected.map((s) => (s.key === key ? { ...s, quantity } : s)),
    }));
  }

  /** Build the API line payload for one selected item (omit undefined fields). */
  function toLinePayload(s: SelItem) {
    const line: Record<string, unknown> = { sku: s.sku, quantity: s.quantity, source: s.source };
    if (s.source !== "catalogue") {
      line.name = s.name;
      line.unitPrice = s.unitPrice;
    }
    if (s.gstRate != null) line.gstRate = s.gstRate;
    if (s.hsn) line.hsn = s.hsn;
    if (s.uqc) line.uqc = s.uqc;
    if (s.notes) line.notes = s.notes;
    return line;
  }

  /** Client-side validation: which custom/charge lines are incomplete. Returns key -> message. */
  const lineErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    for (const s of form.selected) {
      if (s.source === "catalogue") continue;
      const problems: string[] = [];
      if (!s.name || s.name.trim() === "") problems.push("description");
      if (s.unitPrice == null || !(s.unitPrice > 0)) problems.push("unit price");
      if (s.source === "custom" && !(s.quantity > 0)) problems.push("quantity");
      if (problems.length > 0) errs[s.key] = `Missing/invalid: ${problems.join(", ")}`;
    }
    return errs;
  }, [form.selected]);
  const hasLineErrors = Object.keys(lineErrors).length > 0;

  function openCustomWith(prefillName: string) {
    setCustomDraft({ ...emptyCustom, name: prefillName });
    setCustomErr("");
    setCustomOpen(true);
  }

  function commitCustom() {
    const name = customDraft.name.trim();
    const unitPrice = Number(customDraft.unitPrice);
    const quantity = Number(customDraft.quantity);
    if (!name) return setCustomErr("Description is required.");
    if (!(unitPrice > 0)) return setCustomErr("Unit price must be greater than 0.");
    if (!(quantity > 0)) return setCustomErr("Quantity must be greater than 0.");
    if (customDraft.hsn && !/^\d{4,8}$/.test(customDraft.hsn)) return setCustomErr("HSN must be 4-8 digits.");
    const n = form.selected.filter((s) => s.source === "custom").length + 1;
    addLine({
      source: "custom",
      sku: customDraft.sku.trim() || `CUSTOM-${n}`,
      name,
      quantity,
      unitPrice,
      gstRate: customDraft.gstRate === "" ? undefined : Number(customDraft.gstRate),
      hsn: customDraft.hsn || undefined,
      uqc: customDraft.uqc || undefined,
      notes: customDraft.notes || undefined,
    });
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
    const n = form.selected.filter((s) => s.source === "charge").length + 1;
    addLine({
      source: "charge",
      sku: `CHARGE-${n}`,
      name,
      quantity: 1,
      unitPrice: amount,
      gstRate: chargeDraft.gstRate === "" ? undefined : Number(chargeDraft.gstRate),
      hsn: chargeDraft.hsn || undefined,
    });
    setChargeDraft(emptyCharge);
    setChargeErr("");
    setChargeOpen(false);
  }

  // Live pricing preview (debounced).
  useEffect(() => {
    if (form.selected.length === 0) {
      setPricing(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/pricing/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            products: form.selected.map(toLinePayload),
            kitCount: form.kitCount,
            packagingTier: form.packagingTier,
            rushOrder: form.rushOrder,
            rushDays: form.rushDays,
            personalisation: form.personalisation,
            resumeIntelligence: form.resumeIntelligence,
          }),
        });
        const json = await res.json();
        if (json.data) setPricing(json.data as PricingResult);
      } catch {
        /* ignore preview errors */
      }
    }, 500);
    return () => clearTimeout(t);
  }, [
    form.selected,
    form.kitCount,
    form.packagingTier,
    form.rushOrder,
    form.rushDays,
    form.personalisation,
    form.resumeIntelligence,
  ]);

  const loadQuotes = useCallback(async () => {
    const res = await fetch("/api/quotes");
    const json = await res.json();
    if (json.data) setQuotes(json.data);
  }, []);
  useEffect(() => {
    void loadQuotes();
  }, [loadQuotes]);

  function toInput() {
    return {
      clientName: form.clientName,
      clientCompany: form.clientCompany,
      clientEmail: form.clientEmail,
      clientPhone: form.clientPhone,
      occasion: form.occasion,
      products: form.selected.map(toLinePayload),
      packagingTier: form.packagingTier,
      personalisation: form.personalisation,
      resumeIntelligence: form.resumeIntelligence,
      rushOrder: form.rushOrder,
      rushDays: form.rushDays,
      kitCount: form.kitCount,
      validityDays: form.validityDays,
      notes: form.notes,
      discountPercent: form.discountPercent,
      discountReason: form.discountReason,
    };
  }

  async function createQuote(): Promise<any | null> {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toInput()),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(`Error: ${json.message ?? "failed"}`);
        return null;
      }
      setMsg(`Created ${json.data.quote_number}`);
      void loadQuotes();
      return json.data;
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    await createQuote();
  }
  async function generatePdf() {
    const q = await createQuote();
    if (q) window.open(`/api/quotes/${q.id}/pdf`, "_blank");
  }
  async function send(channel: "wa" | "email") {
    const q = await createQuote();
    if (!q) return;
    const res = await fetch(`/api/quotes/${q.id}/send`, { method: "POST" });
    const json = await res.json();
    if (json.data) window.open(channel === "wa" ? json.data.whatsappUrl : json.data.emailUrl, "_blank");
  }

  function loadIntoForm(q: QuoteRow) {
    setForm({
      clientName: q.client_name ?? "",
      clientCompany: q.client_company ?? "",
      clientEmail: q.client_email ?? "",
      clientPhone: q.client_phone ?? "+91 ",
      occasion: q.occasion ?? OCCASIONS[0].label,
      selected: (q.products ?? []).map((p: QuoteProductRow) => {
        const source: LineSource = p.source ?? "catalogue";
        return {
          key: nextKey(),
          source,
          sku: p.sku,
          name:
            source === "catalogue"
              ? (PRODUCTS.find((x) => x.sku === p.sku)?.name ?? p.sku)
              : (p.name ?? p.sku),
          quantity: p.quantity,
          unitPrice: source === "catalogue" ? undefined : p.unitPrice,
          gstRate: p.gstRate,
          hsn: p.hsn,
          uqc: p.uqc,
          notes: p.notes,
        };
      }),
      kitCount: q.kit_count ?? 25,
      packagingTier: q.packaging_tier ?? "standard",
      personalisation: q.personalisation_level ?? "name_occasion",
      resumeIntelligence: Boolean(q.resume_intelligence),
      rushOrder: Boolean(q.rush_order),
      rushDays: q.rush_days ?? 7,
      discountPercent: Number(q.discount_percent ?? 0),
      discountReason: "",
      validityDays: q.validity_days ?? 15,
      notes: q.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function duplicate(id: string) {
    const res = await fetch(`/api/quotes/${id}`);
    const json = await res.json();
    const q = json.data as QuoteRow | undefined;
    if (!q) return;
    const input = {
      clientName: q.client_name,
      clientCompany: q.client_company,
      clientEmail: q.client_email,
      clientPhone: q.client_phone,
      occasion: q.occasion,
      products: (q.products ?? []).map((p: QuoteProductRow) => {
        const source: LineSource = p.source ?? "catalogue";
        const line: Record<string, unknown> = { sku: p.sku, quantity: p.quantity, source };
        if (source !== "catalogue") {
          line.name = p.name;
          line.unitPrice = p.unitPrice;
        }
        if (p.gstRate != null) line.gstRate = p.gstRate;
        if (p.hsn) line.hsn = p.hsn;
        if (p.uqc) line.uqc = p.uqc;
        if (p.notes) line.notes = p.notes;
        return line;
      }),
      packagingTier: q.packaging_tier,
      personalisation: q.personalisation_level,
      resumeIntelligence: q.resume_intelligence,
      rushOrder: q.rush_order,
      rushDays: q.rush_days ?? undefined,
      kitCount: q.kit_count,
      validityDays: q.validity_days,
      notes: q.notes ?? undefined,
    };
    const dup = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (dup.ok) void loadQuotes();
  }

  const labelCls = "block text-xs font-semibold text-[#1A1A2E] mb-1";
  const inputCls = "h-10 w-full rounded-lg border border-[#EDE9E3] px-3 text-sm";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      {/* Form */}
      <div className="space-y-6">
        <section className="rounded-xl border border-[#EDE9E3] bg-white p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#888]">Client</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={labelCls}>Name</label><input className={inputCls} value={form.clientName} onChange={(e) => set("clientName", e.target.value)} /></div>
            <div><label className={labelCls}>Company</label><input className={inputCls} value={form.clientCompany} onChange={(e) => set("clientCompany", e.target.value)} /></div>
            <div><label className={labelCls}>Email</label><input className={inputCls} type="email" value={form.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} /></div>
            <div><label className={labelCls}>Phone</label><input className={inputCls} value={form.clientPhone} onChange={(e) => set("clientPhone", e.target.value)} /></div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Occasion</label>
              <select className={inputCls} value={form.occasion} onChange={(e) => set("occasion", e.target.value)}>
                {OCCASIONS.map((o) => <option key={o.id} value={o.label}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#EDE9E3] bg-white p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#888]">Products</h2>
          <div className="flex gap-2">
            <input className={inputCls} placeholder="Search catalogue products to add…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button type="button" onClick={() => openCustomWith("")} className="whitespace-nowrap rounded-lg border border-navy px-3 text-sm font-semibold text-navy">+ Custom item</button>
            <button type="button" onClick={() => { setChargeDraft(emptyCharge); setChargeErr(""); setChargeOpen(true); }} className="whitespace-nowrap rounded-lg border border-navy px-3 text-sm font-semibold text-navy">+ Charge</button>
          </div>

          {searchResults.length > 0 ? (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-[#EDE9E3]">
              {searchResults.map((p) => (
                <button key={p.sku} type="button" onClick={() => { addProduct(p.sku, p.name); setSearch(""); }} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-secondary">
                  <span>{p.name} <span className="text-[#999]">({p.sku})</span></span>
                  <span className="text-gold">+ Add</span>
                </button>
              ))}
            </div>
          ) : search.trim() !== "" ? (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-dashed border-[#EDE9E3] px-3 py-2 text-sm">
              <span className="text-[#999]">No catalogue match for &quot;{search.trim()}&quot;.</span>
              <button type="button" onClick={() => openCustomWith(search.trim())} className="whitespace-nowrap font-semibold text-gold">+ Add as custom item</button>
            </div>
          ) : null}

          {customOpen ? (
            <div className="mt-3 space-y-2 rounded-lg border border-gold/50 bg-[#FCFAF5] p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-[#888]">Custom item</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input className={inputCls} placeholder="Description *" value={customDraft.name} onChange={(e) => setCustomDraft((d) => ({ ...d, name: e.target.value }))} />
                <input className={inputCls} placeholder="Code / SKU (optional)" value={customDraft.sku} onChange={(e) => setCustomDraft((d) => ({ ...d, sku: e.target.value }))} />
                <input className={inputCls} type="number" min={1} placeholder="Quantity *" value={customDraft.quantity} onChange={(e) => setCustomDraft((d) => ({ ...d, quantity: Math.max(1, Number(e.target.value) || 1) }))} />
                <input className={inputCls} type="number" min={0} placeholder="Unit price (Rs) *" value={customDraft.unitPrice} onChange={(e) => setCustomDraft((d) => ({ ...d, unitPrice: e.target.value === "" ? "" : Number(e.target.value) }))} />
                <select className={inputCls} value={customDraft.gstRate} onChange={(e) => setCustomDraft((d) => ({ ...d, gstRate: e.target.value === "" ? "" : Number(e.target.value) }))}>
                  <option value="">GST % (optional)</option>
                  {GST_RATE_OPTIONS.map((r) => <option key={r} value={r}>{r}%</option>)}
                </select>
                <input className={inputCls} placeholder="HSN (optional, 4-8 digits)" value={customDraft.hsn} onChange={(e) => setCustomDraft((d) => ({ ...d, hsn: e.target.value }))} />
                <select className={inputCls} value={customDraft.uqc} onChange={(e) => setCustomDraft((d) => ({ ...d, uqc: e.target.value as (typeof UQC_OPTIONS)[number] | "" }))}>
                  <option value="">UQC (optional)</option>
                  {UQC_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                <input className={inputCls} placeholder="Notes (optional)" value={customDraft.notes} onChange={(e) => setCustomDraft((d) => ({ ...d, notes: e.target.value }))} />
              </div>
              {customErr ? <p className="text-xs text-destructive">{customErr}</p> : null}
              <div className="flex gap-2">
                <button type="button" onClick={commitCustom} className="rounded-lg bg-navy px-4 py-1.5 text-sm font-semibold text-white">Add item</button>
                <button type="button" onClick={() => { setCustomOpen(false); setCustomErr(""); }} className="rounded-lg border border-[#EDE9E3] px-4 py-1.5 text-sm">Cancel</button>
              </div>
            </div>
          ) : null}

          {chargeOpen ? (
            <div className="mt-3 space-y-2 rounded-lg border border-gold/50 bg-[#FCFAF5] p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-[#888]">Charge (freight / packing / design)</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input className={inputCls} placeholder="Description *" value={chargeDraft.name} onChange={(e) => setChargeDraft((d) => ({ ...d, name: e.target.value }))} />
                <input className={inputCls} type="number" min={0} placeholder="Amount (Rs) *" value={chargeDraft.amount} onChange={(e) => setChargeDraft((d) => ({ ...d, amount: e.target.value === "" ? "" : Number(e.target.value) }))} />
                <select className={inputCls} value={chargeDraft.gstRate} onChange={(e) => setChargeDraft((d) => ({ ...d, gstRate: e.target.value === "" ? "" : Number(e.target.value) }))}>
                  <option value="">GST % (optional)</option>
                  {GST_RATE_OPTIONS.map((r) => <option key={r} value={r}>{r}%</option>)}
                </select>
                <input className={inputCls} placeholder="HSN (optional, 4-8 digits)" value={chargeDraft.hsn} onChange={(e) => setChargeDraft((d) => ({ ...d, hsn: e.target.value }))} />
              </div>
              {chargeErr ? <p className="text-xs text-destructive">{chargeErr}</p> : null}
              <div className="flex gap-2">
                <button type="button" onClick={commitCharge} className="rounded-lg bg-navy px-4 py-1.5 text-sm font-semibold text-white">Add charge</button>
                <button type="button" onClick={() => { setChargeOpen(false); setChargeErr(""); }} className="rounded-lg border border-[#EDE9E3] px-4 py-1.5 text-sm">Cancel</button>
              </div>
            </div>
          ) : null}

          <ul className="mt-3 space-y-2">
            {form.selected.map((s) => (
              <li key={s.key} className="rounded-lg border border-[#EDE9E3] px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="flex-1">
                    <SourceBadge source={s.source} />
                    {s.name} <span className="text-[#999]">({s.sku || "-"})</span>
                    {s.source !== "catalogue" ? (
                      <span className="text-[#999]"> · Rs {Math.round(s.unitPrice ?? 0).toLocaleString("en-IN")}{s.source === "custom" ? "/unit" : ""}</span>
                    ) : null}
                    {s.gstRate != null ? <span className="text-[#bbb]"> · GST {s.gstRate}%</span> : null}
                  </span>
                  {s.source !== "charge" ? (
                    <input type="number" min={1} value={s.quantity} onChange={(e) => setQty(s.key, Math.max(1, Number(e.target.value) || 1))} className="h-8 w-20 rounded border border-[#EDE9E3] px-2 text-sm" />
                  ) : (
                    <span className="w-20 text-center text-xs text-[#999]">qty 1</span>
                  )}
                  <button type="button" onClick={() => removeLine(s.key)} className="text-destructive">✕</button>
                </div>
                {lineErrors[s.key] ? <p className="mt-1 text-xs text-destructive">{lineErrors[s.key]}</p> : null}
              </li>
            ))}
            {form.selected.length === 0 ? <li className="text-sm text-[#999]">No products added.</li> : null}
          </ul>
        </section>

        <section className="rounded-xl border border-[#EDE9E3] bg-white p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#888]">Configuration</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={labelCls}>Kit count</label><input className={inputCls} type="number" min={1} value={form.kitCount} onChange={(e) => set("kitCount", Math.max(1, Number(e.target.value) || 1))} /></div>
            <div>
              <label className={labelCls}>Packaging tier</label>
              <select className={inputCls} value={form.packagingTier} onChange={(e) => set("packagingTier", e.target.value as Tier)}>
                <option value="essential">Essential</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="flagship">Flagship</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Personalisation</label>
              <select className={inputCls} value={form.personalisation} onChange={(e) => set("personalisation", e.target.value as Level)}>
                <option value="name_only">Name Only</option>
                <option value="name_occasion">Name + Occasion</option>
                <option value="full_personal">Full Personal Touch</option>
              </select>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.resumeIntelligence} onChange={(e) => set("resumeIntelligence", e.target.checked)} /> Resume Intelligence</label>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.rushOrder} onChange={(e) => set("rushOrder", e.target.checked)} /> Rush order</label>
              {form.rushOrder ? <input type="number" min={0} value={form.rushDays} onChange={(e) => set("rushDays", Number(e.target.value) || 0)} className="h-8 w-20 rounded border border-[#EDE9E3] px-2 text-sm" title="Days to delivery" /> : null}
            </div>
            <div><label className={labelCls}>Discount %</label><input className={inputCls} type="number" min={0} max={100} value={form.discountPercent} onChange={(e) => set("discountPercent", Number(e.target.value) || 0)} /></div>
            <div><label className={labelCls}>Discount reason</label><input className={inputCls} value={form.discountReason} onChange={(e) => set("discountReason", e.target.value)} /></div>
            <div><label className={labelCls}>Validity (days)</label><input className={inputCls} type="number" min={1} value={form.validityDays} onChange={(e) => set("validityDays", Number(e.target.value) || 15)} /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Internal notes</label><textarea className="w-full rounded-lg border border-[#EDE9E3] p-3 text-sm" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={busy || form.selected.length === 0 || hasLineErrors} onClick={saveDraft} className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Save as Draft</button>
          <button type="button" disabled={busy || form.selected.length === 0 || hasLineErrors} onClick={generatePdf} className="rounded-lg border border-navy px-5 py-2.5 text-sm font-semibold text-navy disabled:opacity-40">Generate PDF</button>
          <button type="button" disabled={busy || form.selected.length === 0 || hasLineErrors} onClick={() => send("wa")} className="rounded-lg border border-navy px-5 py-2.5 text-sm font-semibold text-navy disabled:opacity-40">Send via WhatsApp</button>
          <button type="button" disabled={busy || form.selected.length === 0 || hasLineErrors} onClick={() => send("email")} className="rounded-lg border border-navy px-5 py-2.5 text-sm font-semibold text-navy disabled:opacity-40">Send via Email</button>
          {hasLineErrors ? <span className="self-center text-sm text-destructive">Fix the highlighted custom lines before saving.</span> : null}
          {msg ? <span className="self-center text-sm text-[#666]">{msg}</span> : null}
        </div>

        {/* Quote list */}
        <section className="rounded-xl border border-[#EDE9E3] bg-white p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#888]">Recent Quotes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-[#999]">
                <tr><th className="py-2">Quote</th><th>Company</th><th>Occasion</th><th>Kits</th><th>Total</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.id} className="border-t border-[#EDE9E3]">
                    <td className="cursor-pointer py-2 font-medium text-navy" onClick={() => loadIntoForm(q)}>{q.quote_number}</td>
                    <td>{q.client_company}</td>
                    <td>{q.occasion}</td>
                    <td>{q.kit_count}</td>
                    <td>{rs(Number(q.final_total))}</td>
                    <td><span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{q.status}</span></td>
                    <td className="space-x-2 whitespace-nowrap py-2 text-xs">
                      <a href={`/api/quotes/${q.id}/pdf`} target="_blank" rel="noreferrer" className="text-gold">PDF</a>
                      <button type="button" onClick={() => duplicate(q.id)} className="text-navy">Duplicate</button>
                    </td>
                  </tr>
                ))}
                {quotes.length === 0 ? <tr><td colSpan={7} className="py-4 text-[#999]">No quotes yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Live pricing preview */}
      <aside className="sticky top-6 h-fit rounded-xl border border-[#EDE9E3] bg-white p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#888]">Live Investment Preview</h2>
        {!pricing ? (
          <p className="text-sm text-[#999]">Add products to see the breakdown.</p>
        ) : (
          <div className="space-y-1.5 text-sm">
            <Row label="Subtotal (products)" value={rs(pricing.subtotal)} />
            <Row label={`Packaging × ${pricing.kitCount}`} value={rs(pricing.packagingTotal)} />
            {pricing.personalisationTotal > 0 ? <Row label="Personalisation" value={rs(pricing.personalisationTotal)} /> : null}
            {pricing.resumeIntelligenceTotal > 0 ? <Row label="Resume Intelligence" value={rs(pricing.resumeIntelligenceTotal)} /> : null}
            {pricing.rushSurchargeAmount > 0 ? <Row label={`Rush (${pricing.rushSurchargePercent}%)`} value={rs(pricing.rushSurchargeAmount)} /> : null}
            <div className="my-2 border-t border-[#EDE9E3]" />
            <Row label="Grand total" value={rs(pricing.grandTotal)} bold />
            <Row label="Per kit" value={rs(pricing.perKitInvestment)} gold />
            <p className="mt-3 text-xs text-[#bbb]">Internal margin: {pricing.overallMarginPercent}%</p>
          </div>
        )}
      </aside>
    </div>
  );
}

function SourceBadge({ source }: { source: LineSource }) {
  if (source === "catalogue") return null;
  const label = source === "custom" ? "CUSTOM" : "CHARGE";
  return (
    <span className="mr-2 rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold">
      {label}
    </span>
  );
}

function Row({ label, value, bold, gold }: { label: string; value: string; bold?: boolean; gold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={gold ? "text-gold" : "text-[#666]"}>{label}</span>
      <span className={`${bold ? "font-bold text-navy" : ""} ${gold ? "font-bold text-gold" : ""}`}>{value}</span>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
