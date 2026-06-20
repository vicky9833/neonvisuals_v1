"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { cn } from "@/lib/utils";
import { INDUSTRIES, EMPLOYEE_COUNTS } from "@/lib/auth-types";
import { BUCKETS } from "@/data/buckets";
import type { Lead, LeadInput, LeadPriority } from "@/lib/engines/lead";
import { LEAD_OCCASIONS, LEAD_SOURCES } from "./lead-meta";

interface LeadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  onSaved: () => void;
}

const PRIORITIES: { value: LeadPriority; label: string }[] = [
  { value: "hot", label: "Hot" },
  { value: "warm", label: "Warm" },
  { value: "medium", label: "Medium" },
  { value: "cold", label: "Cold" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="font-heading text-sm font-semibold text-navy">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export function LeadForm({ open, onOpenChange, lead, onSaved }: LeadFormProps) {
  const editing = Boolean(lead);
  const [form, setForm] = useState({
    contactName: lead?.contact_name ?? "",
    contactEmail: lead?.contact_email ?? "",
    contactPhone: lead?.contact_phone ?? "",
    contactDesignation: lead?.contact_designation ?? "",
    companyName: lead?.company_name ?? "",
    companyIndustry: lead?.company_industry ?? "",
    companySize: lead?.company_size ?? "",
    companyCity: lead?.company_city ?? "Bangalore",
    companyWebsite: lead?.company_website ?? "",
    source: lead?.source ?? "website",
    sourceDetail: lead?.source_detail ?? "",
    priority: (lead?.priority ?? "medium") as LeadPriority,
    estimatedOrderValue: lead?.estimated_order_value?.toString() ?? "",
    estimatedKitCount: lead?.estimated_kit_count?.toString() ?? "",
    nextFollowUpDate: lead?.next_follow_up_date ?? "",
    nextFollowUpNote: lead?.next_follow_up_note ?? "",
    tags: (lead?.tags ?? []).join(", "),
    notes: lead?.notes ?? "",
  });
  const [collections, setCollections] = useState<string[]>(
    lead?.interested_collections ?? [],
  );
  const [occasions, setOccasions] = useState<string[]>(
    lead?.interested_occasions ?? [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
    );
  }

  async function submit() {
    setError(null);
    if (!form.contactName.trim()) return setError("Contact name is required.");
    if (!form.companyName.trim()) return setError("Company name is required.");

    const payload: LeadInput = {
      contactName: form.contactName.trim(),
      contactEmail: form.contactEmail.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      contactDesignation: form.contactDesignation.trim() || undefined,
      companyName: form.companyName.trim(),
      companyIndustry: form.companyIndustry || undefined,
      companySize: form.companySize || undefined,
      companyCity: form.companyCity.trim() || undefined,
      companyWebsite: form.companyWebsite.trim() || undefined,
      source: form.source as LeadInput["source"],
      sourceDetail: form.sourceDetail.trim() || undefined,
      priority: form.priority,
      estimatedOrderValue: form.estimatedOrderValue
        ? Number(form.estimatedOrderValue)
        : undefined,
      estimatedKitCount: form.estimatedKitCount
        ? Number(form.estimatedKitCount)
        : undefined,
      interestedCollections: collections,
      interestedOccasions: occasions,
      nextFollowUpDate: form.nextFollowUpDate || undefined,
      nextFollowUpNote: form.nextFollowUpNote.trim() || undefined,
      tags: form.tags
        ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : undefined,
      notes: form.notes.trim() || undefined,
    };

    setBusy(true);
    try {
      const res = await fetch(
        editing ? `/api/leads/${lead!.id}` : "/api/leads",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await res.json();
      if (!res.ok) {
        setError(body?.message ?? "Failed to save lead.");
        return;
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save lead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Lead" : "New Lead"}</DialogTitle>
          <DialogDescription>
            Capture every detail — it powers lead scoring and the pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Section title="Contact Information">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cn">Name *</Label>
                <Input
                  id="cn"
                  value={form.contactName}
                  onChange={(e) => set("contactName", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cd">Designation</Label>
                <Input
                  id="cd"
                  value={form.contactDesignation}
                  onChange={(e) => set("contactDesignation", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ce">Email</Label>
                <Input
                  id="ce"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => set("contactEmail", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cp">Phone</Label>
                <Input
                  id="cp"
                  value={form.contactPhone}
                  onChange={(e) => set("contactPhone", e.target.value)}
                />
              </div>
            </div>
          </Section>

          <Section title="Company Information">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="comp">Company Name *</Label>
                <Input
                  id="comp"
                  value={form.companyName}
                  onChange={(e) => set("companyName", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Industry</Label>
                <Select
                  value={form.companyIndustry}
                  onValueChange={(v) => set("companyIndustry", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Employee Count</Label>
                <Select
                  value={form.companySize}
                  onValueChange={(v) => set("companySize", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_COUNTS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.companyCity}
                  onChange={(e) => set("companyCity", e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="web">Website</Label>
                <Input
                  id="web"
                  value={form.companyWebsite}
                  onChange={(e) => set("companyWebsite", e.target.value)}
                />
              </div>
            </div>
          </Section>

          <Section title="Lead Details">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Source *</Label>
                <Select
                  value={form.source}
                  onValueChange={(v) => set("source", v as typeof form.source)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="sd">Source Detail</Label>
                <Input
                  id="sd"
                  value={form.sourceDetail}
                  onChange={(e) => set("sourceDetail", e.target.value)}
                  placeholder="e.g. Referred by Priya at TechCo"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Priority</Label>
              <div className="flex flex-wrap gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => set("priority", p.value)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm transition-colors",
                      form.priority === p.value
                        ? "border-navy bg-navy text-white"
                        : "border-border text-[#6B7280] hover:border-navy",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="eov">Estimated Order Value (₹)</Label>
                <Input
                  id="eov"
                  type="number"
                  value={form.estimatedOrderValue}
                  onChange={(e) => set("estimatedOrderValue", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ekc">Estimated Kit Count</Label>
                <Input
                  id="ekc"
                  type="number"
                  value={form.estimatedKitCount}
                  onChange={(e) => set("estimatedKitCount", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Interested Collections</Label>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {BUCKETS.map((b) => (
                  <label
                    key={b.code}
                    className="flex items-center gap-2 text-sm text-[#2D2D2D]"
                  >
                    <Checkbox
                      checked={collections.includes(b.code)}
                      onCheckedChange={() =>
                        toggle(collections, setCollections, b.code)
                      }
                    />
                    <span className="truncate">{b.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Interested Occasions</Label>
              <div className="flex flex-wrap gap-3">
                {LEAD_OCCASIONS.map((o) => (
                  <label
                    key={o.value}
                    className="flex items-center gap-2 text-sm text-[#2D2D2D]"
                  >
                    <Checkbox
                      checked={occasions.includes(o.value)}
                      onCheckedChange={() =>
                        toggle(occasions, setOccasions, o.value)
                      }
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Follow-up">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="fud">Next Follow-up Date</Label>
                <Input
                  id="fud"
                  type="date"
                  value={form.nextFollowUpDate}
                  onChange={(e) => set("nextFollowUpDate", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fun">Follow-up Note</Label>
                <Input
                  id="fun"
                  value={form.nextFollowUpNote}
                  onChange={(e) => set("nextFollowUpNote", e.target.value)}
                />
              </div>
            </div>
          </Section>

          <Section title="Additional">
            <div className="space-y-1">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="diwali-2026, high-value"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
              />
            </div>
          </Section>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? "Saving…" : editing ? "Save Changes" : "Create Lead"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
