"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp } from "lucide-react";
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
import { CATEGORY_OPTIONS } from "./blog-meta";

export interface BlogFormState {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  status: string;
  publishedAt: string;
  scheduledFor: string;
  tags: string;
  heroImageUrl: string;
  heroImageAlt: string;
  ogImageUrl: string;
  authorName: string;
  authorRole: string;
  readTime: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  canonicalUrl: string;
  relatedProducts: string;
  relatedCollections: string;
  ctaType: string;
  ctaText: string;
  ctaUrl: string;
}

interface BlogSettingsProps {
  form: BlogFormState;
  set: <K extends keyof BlogFormState>(key: K, value: BlogFormState[K]) => void;
}

const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "scheduled", label: "Scheduled" },
  { value: "archived", label: "Archived" },
];

const CTA_TYPES = [
  { value: "enquire", label: "Enquire" },
  { value: "gift_builder", label: "Gift Builder" },
  { value: "catalog", label: "Catalog" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "none", label: "None" },
];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function BlogSettings({ form, set }: BlogSettingsProps) {
  const [seoOpen, setSeoOpen] = useState(false);

  return (
    <div className="space-y-4">
      <Field label="Status">
        <Select value={form.status} onValueChange={(v) => set("status", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {form.status === "published" && (
        <Field label="Published date">
          <Input
            type="date"
            value={form.publishedAt}
            onChange={(e) => set("publishedAt", e.target.value)}
          />
        </Field>
      )}
      {form.status === "scheduled" && (
        <Field label="Scheduled for">
          <Input
            type="datetime-local"
            value={form.scheduledFor}
            onChange={(e) => set("scheduledFor", e.target.value)}
          />
        </Field>
      )}

      <Field label="Category">
        <Select value={form.category} onValueChange={(v) => set("category", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.filter((c) => c.value !== "all").map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Slug">
        <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} />
      </Field>

      <Field label="Tags (comma-separated)">
        <Input
          value={form.tags}
          onChange={(e) => set("tags", e.target.value)}
          placeholder="diwali, corporate-gifts"
        />
      </Field>

      <Field label="Hero image URL">
        <Input
          value={form.heroImageUrl}
          onChange={(e) => set("heroImageUrl", e.target.value)}
          placeholder="https://…/product-images/NV-A01/NV-A01_01.webp"
        />
      </Field>
      {form.heroImageUrl ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-secondary">
          <Image
            src={form.heroImageUrl}
            alt="Hero preview"
            fill
            sizes="320px"
            className="object-cover"
          />
        </div>
      ) : null}
      <Field label="Hero image alt">
        <Input
          value={form.heroImageAlt}
          onChange={(e) => set("heroImageAlt", e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Author name">
          <Input
            value={form.authorName}
            onChange={(e) => set("authorName", e.target.value)}
          />
        </Field>
        <Field label="Author role">
          <Input
            value={form.authorRole}
            onChange={(e) => set("authorRole", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Read time (minutes)">
        <Input
          type="number"
          value={form.readTime}
          onChange={(e) => set("readTime", e.target.value)}
        />
      </Field>

      {/* SEO (collapsible) */}
      <div className="rounded-card border border-border">
        <button
          type="button"
          onClick={() => setSeoOpen((o) => !o)}
          className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-navy"
        >
          SEO
          {seoOpen ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
        {seoOpen && (
          <div className="space-y-3 border-t border-border p-3">
            <Field label="Meta title">
              <Input
                value={form.metaTitle}
                onChange={(e) => set("metaTitle", e.target.value)}
              />
            </Field>
            <Field label="Meta description">
              <Textarea
                value={form.metaDescription}
                onChange={(e) => set("metaDescription", e.target.value)}
                rows={2}
              />
            </Field>
            <Field label="Keywords (comma-separated)">
              <Input
                value={form.keywords}
                onChange={(e) => set("keywords", e.target.value)}
              />
            </Field>
            <Field label="Canonical URL">
              <Input
                value={form.canonicalUrl}
                onChange={(e) => set("canonicalUrl", e.target.value)}
              />
            </Field>
          </div>
        )}
      </div>

      <Field label="Related product SKUs (comma-separated)">
        <Input
          value={form.relatedProducts}
          onChange={(e) => set("relatedProducts", e.target.value)}
          placeholder="NV-A01, NV-A09"
        />
      </Field>
      <Field label="Related collection codes (comma-separated)">
        <Input
          value={form.relatedCollections}
          onChange={(e) => set("relatedCollections", e.target.value)}
          placeholder="A, C"
        />
      </Field>

      <Field label="CTA type">
        <Select value={form.ctaType} onValueChange={(v) => set("ctaType", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CTA_TYPES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="CTA text">
        <Input value={form.ctaText} onChange={(e) => set("ctaText", e.target.value)} />
      </Field>
      <Field label="CTA URL (optional)">
        <Input value={form.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)} />
      </Field>
    </div>
  );
}
