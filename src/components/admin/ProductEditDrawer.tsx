"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Archive, Star, Trash2, Upload } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminProduct, BucketOption } from "@/lib/admin/products";

interface ProductEditDrawerProps {
  sku: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buckets: BucketOption[];
  onSaved: () => void;
}

const PACKAGING = ["budget", "standard", "premium", "flagship"];

export function ProductEditDrawer({
  sku,
  open,
  onOpenChange,
  buckets,
  onSaved,
}: ProductEditDrawerProps) {
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Local editable fields
  const [form, setForm] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("active");
  const [bucketId, setBucketId] = useState("");
  const [packaging, setPackaging] = useState("standard");
  const [flags, setFlags] = useState({ isNew: false, isBestseller: false, isFeatured: false });

  async function load() {
    if (!sku) return;
    setLoading(true);
    const res = await fetch(`/api/ops/products/${sku}`);
    if (res.ok) {
      const body = await res.json();
      const p = body.data as AdminProduct;
      setProduct(p);
      setForm({
        name: p.name ?? "",
        tagline: p.tagline ?? "",
        description: p.description ?? "",
        wowScore: String(p.wow_score ?? 5),
        leadTimeDays: String(p.lead_time_days ?? ""),
        moq: String(p.moq ?? ""),
        materials: (p.materials ?? []).join(", "),
        tags: (p.tags ?? []).join(", "),
        cogs: String(p.cogs ?? ""),
        priceSingle: String(p.price_single ?? ""),
        priceBulk25: String(p.price_bulk_25 ?? ""),
        priceBulk100: String(p.price_bulk_100 ?? ""),
      });
      setStatus(p.status);
      setBucketId(p.bucket_id ?? "");
      setPackaging(p.recommended_packaging ?? "standard");
      setFlags({
        isNew: p.is_new,
        isBestseller: p.is_bestseller,
        isFeatured: p.is_featured,
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    if (open && sku) {
      // Intentional reset-on-open so a previously-loaded SKU's data doesn't flash before load().
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProduct(null);
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sku]);

  function f(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const margin =
    Number(form.priceSingle) > 0
      ? Math.round(
          ((Number(form.priceSingle) - Number(form.cogs || 0)) /
            Number(form.priceSingle)) *
            100,
        )
      : product?.margin_percent ?? 0;

  async function save() {
    if (!sku) return;
    setBusy(true);
    try {
      const num = (v: string) => (v === "" ? null : Number(v));
      const res = await fetch(`/api/ops/products/${sku}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          tagline: form.tagline || null,
          description: form.description || null,
          bucketId: bucketId || null,
          wowScore: form.wowScore ? Number(form.wowScore) : null,
          leadTimeDays: num(form.leadTimeDays),
          moq: num(form.moq),
          materials: form.materials
            ? form.materials.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
          tags: form.tags
            ? form.tags.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
          cogs: num(form.cogs),
          priceSingle: num(form.priceSingle),
          priceBulk25: num(form.priceBulk25),
          priceBulk100: num(form.priceBulk100),
          recommendedPackaging: packaging,
          status,
          isNew: flags.isNew,
          isBestseller: flags.isBestseller,
          isFeatured: flags.isFeatured,
        }),
      });
      if (res.ok) {
        onSaved();
        onOpenChange(false);
      }
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(file: File) {
    if (!sku) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/ops/products/${sku}/images`, {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        const body = await res.json();
        setProduct(body.data as AdminProduct);
        onSaved();
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteImage(url: string) {
    if (!sku) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/ops/products/${sku}/images`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const body = await res.json();
        setProduct(body.data as AdminProduct);
        onSaved();
      }
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!sku) return;
    const ok = window.confirm(
      `Archive ${sku}?\n\nIt will be removed from the public catalog on the next publish. ` +
        `Nothing is deleted — you can restore it later by setting its status back to Active.`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/ops/products/${sku}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      if (res.ok) {
        onSaved();
        onOpenChange(false);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{sku}</SheetTitle>
          <SheetDescription>Edit catalog data (database only).</SheetDescription>
        </SheetHeader>

        {loading || !product ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-6 px-1 py-4">
            {/* Basic */}
            <Section title="Basic Info">
              <Field label="Name">
                <Input value={form.name} onChange={(e) => f("name", e.target.value)} />
              </Field>
              <Field label="Tagline">
                <Input value={form.tagline} onChange={(e) => f("tagline", e.target.value)} />
              </Field>
              <Field label="Description">
                <Textarea
                  value={form.description}
                  onChange={(e) => f("description", e.target.value)}
                  rows={3}
                />
              </Field>
              <Field label="Collection">
                <Select value={bucketId} onValueChange={setBucketId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {buckets.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.code} · {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </Section>

            {/* Details */}
            <Section title="Details">
              <Field label={`WOW factor: ${form.wowScore}/10`}>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={form.wowScore}
                  onChange={(e) => f("wowScore", e.target.value)}
                  className="w-full accent-gold"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Lead time (days)">
                  <Input type="number" value={form.leadTimeDays} onChange={(e) => f("leadTimeDays", e.target.value)} />
                </Field>
                <Field label="MOQ">
                  <Input type="number" value={form.moq} onChange={(e) => f("moq", e.target.value)} />
                </Field>
              </div>
              <Field label="Materials (comma-separated)">
                <Input value={form.materials} onChange={(e) => f("materials", e.target.value)} />
              </Field>
              <Field label="Tags (comma-separated)">
                <Input value={form.tags} onChange={(e) => f("tags", e.target.value)} />
              </Field>
              <Field label="Packaging tier">
                <Select value={packaging} onValueChange={setPackaging}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PACKAGING.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </Section>

            {/* Pricing */}
            <Section title="Pricing (internal)">
              <div className="grid grid-cols-2 gap-3">
                <Field label="COGS (₹)">
                  <Input type="number" value={form.cogs} onChange={(e) => f("cogs", e.target.value)} />
                </Field>
                <Field label="Single (₹)">
                  <Input type="number" value={form.priceSingle} onChange={(e) => f("priceSingle", e.target.value)} />
                </Field>
                <Field label="Bulk 25+ (₹)">
                  <Input type="number" value={form.priceBulk25} onChange={(e) => f("priceBulk25", e.target.value)} />
                </Field>
                <Field label="Bulk 100+ (₹)">
                  <Input type="number" value={form.priceBulk100} onChange={(e) => f("priceBulk100", e.target.value)} />
                </Field>
              </div>
              <p className="text-sm text-[#6B7280]">
                Margin: <span className="font-numbers font-semibold text-navy">{margin}%</span>
              </p>
            </Section>

            {/* Images */}
            <Section title={`Images (${product.images.length})`}>
              <div className="grid grid-cols-3 gap-2">
                {product.images.map((url) => (
                  <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary">
                    <Image src={url} alt="" fill sizes="120px" className="object-cover" />
                    {product.thumbnail_url === url && (
                      <span className="absolute left-1 top-1 rounded bg-gold p-0.5 text-white">
                        <Star className="size-3" />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteImage(url)}
                      className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Delete image"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(file);
                  e.target.value = "";
                }}
              />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
                <Upload className="mr-1.5 size-4" /> Upload Image
              </Button>
            </Section>

            {/* Status */}
            <Section title="Status">
              <Field label="Status">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Toggle label="New product" checked={flags.isNew} onChange={(v) => setFlags((p) => ({ ...p, isNew: v }))} />
              <Toggle label="Bestseller" checked={flags.isBestseller} onChange={(v) => setFlags((p) => ({ ...p, isBestseller: v }))} />
              <Toggle label="Featured" checked={flags.isFeatured} onChange={(v) => setFlags((p) => ({ ...p, isFeatured: v }))} />
            </Section>

            <div className="flex gap-2">
              <Button onClick={save} disabled={busy} className="flex-1">
                {busy ? "Saving…" : "Save Changes"}
              </Button>
              <Button variant="outline" asChild>
                <a href={`/products/${product.sku.toLowerCase()}`} target="_blank" rel="noopener noreferrer">
                  View
                </a>
              </Button>
            </div>

            {status !== "archived" && (
              <Button
                variant="ghost"
                onClick={archive}
                disabled={busy}
                className="w-full text-[#7C2D36] hover:bg-[#7C2D36]/10 hover:text-[#7C2D36]"
              >
                <Archive className="mr-1.5 size-4" /> Archive product
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="font-heading text-sm font-semibold text-navy">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between">
      <span className="text-sm text-[#2D2D2D]">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
