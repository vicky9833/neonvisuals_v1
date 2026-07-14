"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PRODUCTS } from "@/lib/catalog";
import { OCCASIONS } from "@/lib/gift-builder";
import type { PricingResult } from "@/lib/engines/pricing";

type Tier = "essential" | "standard" | "premium" | "flagship";
type Level = "name_only" | "name_occasion" | "full_personal";
interface SelItem {
  sku: string;
  name: string;
  quantity: number;
}
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
      f.selected.some((s) => s.sku === sku)
        ? f
        : { ...f, selected: [...f.selected, { sku, name, quantity: f.kitCount }] },
    );
  }
  function removeProduct(sku: string) {
    setForm((f) => ({ ...f, selected: f.selected.filter((s) => s.sku !== sku) }));
  }
  function setQty(sku: string, quantity: number) {
    setForm((f) => ({
      ...f,
      selected: f.selected.map((s) => (s.sku === sku ? { ...s, quantity } : s)),
    }));
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
            products: form.selected.map((s) => ({ sku: s.sku, quantity: s.quantity })),
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
      products: form.selected.map((s) => ({ sku: s.sku, quantity: s.quantity })),
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
      selected: (q.products ?? []).map((p: QuoteProductRow) => ({
        sku: p.sku,
        name: PRODUCTS.find((x) => x.sku === p.sku)?.name ?? p.sku,
        quantity: p.quantity,
      })),
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
      products: (q.products ?? []).map((p: QuoteProductRow) => ({ sku: p.sku, quantity: p.quantity })),
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
          <input className={inputCls} placeholder="Search products to add…" value={search} onChange={(e) => setSearch(e.target.value)} />
          {searchResults.length > 0 ? (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-[#EDE9E3]">
              {searchResults.map((p) => (
                <button key={p.sku} type="button" onClick={() => { addProduct(p.sku, p.name); setSearch(""); }} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-secondary">
                  <span>{p.name} <span className="text-[#999]">({p.sku})</span></span>
                  <span className="text-gold">+ Add</span>
                </button>
              ))}
            </div>
          ) : null}
          <ul className="mt-3 space-y-2">
            {form.selected.map((s) => (
              <li key={s.sku} className="flex items-center gap-2 rounded-lg border border-[#EDE9E3] px-3 py-2 text-sm">
                <span className="flex-1">{s.name} <span className="text-[#999]">({s.sku})</span></span>
                <input type="number" min={1} value={s.quantity} onChange={(e) => setQty(s.sku, Math.max(1, Number(e.target.value) || 1))} className="h-8 w-20 rounded border border-[#EDE9E3] px-2 text-sm" />
                <button type="button" onClick={() => removeProduct(s.sku)} className="text-destructive">✕</button>
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
          <button type="button" disabled={busy || form.selected.length === 0} onClick={saveDraft} className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Save as Draft</button>
          <button type="button" disabled={busy || form.selected.length === 0} onClick={generatePdf} className="rounded-lg border border-navy px-5 py-2.5 text-sm font-semibold text-navy disabled:opacity-40">Generate PDF</button>
          <button type="button" disabled={busy || form.selected.length === 0} onClick={() => send("wa")} className="rounded-lg border border-navy px-5 py-2.5 text-sm font-semibold text-navy disabled:opacity-40">Send via WhatsApp</button>
          <button type="button" disabled={busy || form.selected.length === 0} onClick={() => send("email")} className="rounded-lg border border-navy px-5 py-2.5 text-sm font-semibold text-navy disabled:opacity-40">Send via Email</button>
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

function Row({ label, value, bold, gold }: { label: string; value: string; bold?: boolean; gold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={gold ? "text-gold" : "text-[#666]"}>{label}</span>
      <span className={`${bold ? "font-bold text-navy" : ""} ${gold ? "font-bold text-gold" : ""}`}>{value}</span>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
