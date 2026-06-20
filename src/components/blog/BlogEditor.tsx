"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  Link2,
  Image as ImageIcon,
  List,
  Quote,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BlogPost } from "@/lib/engines/blog";
import { BlogContent } from "./BlogContent";
import { BlogSettings, type BlogFormState } from "./BlogSettings";

function toForm(post: BlogPost): BlogFormState {
  const dateOnly = (d: string | null) => (d ? d.slice(0, 10) : "");
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    category: post.category,
    status: post.status,
    publishedAt: dateOnly(post.published_at),
    scheduledFor: post.scheduled_for ? post.scheduled_for.slice(0, 16) : "",
    tags: (post.tags ?? []).join(", "),
    heroImageUrl: post.hero_image_url ?? "",
    heroImageAlt: post.hero_image_alt ?? "",
    ogImageUrl: post.og_image_url ?? "",
    authorName: post.author_name,
    authorRole: post.author_role,
    readTime: String(post.read_time_minutes),
    metaTitle: post.meta_title ?? "",
    metaDescription: post.meta_description ?? "",
    keywords: (post.keywords ?? []).join(", "),
    canonicalUrl: post.canonical_url ?? "",
    relatedProducts: (post.related_product_skus ?? []).join(", "),
    relatedCollections: (post.related_collection_codes ?? []).join(", "),
    ctaType: post.cta_type,
    ctaText: post.cta_text ?? "",
    ctaUrl: post.cta_url ?? "",
  };
}

function csvToArray(v: string): string[] {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function BlogEditor({ post }: { post: BlogPost }) {
  const router = useRouter();
  const [form, setForm] = useState<BlogFormState>(() => toForm(post));
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function set<K extends keyof BlogFormState>(key: K, value: BlogFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /** Insert markdown around the current selection. */
  function wrap(before: string, after = "", placeholder = "") {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = form.content;
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    set("content", next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + before.length + selected.length + after.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function save(targetStatus?: string) {
    setBusy(true);
    setToast(null);
    try {
      const status = targetStatus ?? form.status;
      const payload: Record<string, unknown> = {
        title: form.title,
        slug: form.slug || undefined,
        excerpt: form.excerpt,
        content: form.content,
        category: form.category,
        status,
        tags: csvToArray(form.tags),
        heroImageUrl: form.heroImageUrl,
        heroImageAlt: form.heroImageAlt,
        ogImageUrl: form.ogImageUrl,
        authorName: form.authorName,
        authorRole: form.authorRole,
        readTimeMinutes: Number(form.readTime) || 5,
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
        keywords: csvToArray(form.keywords),
        canonicalUrl: form.canonicalUrl,
        relatedProductSkus: csvToArray(form.relatedProducts),
        relatedCollectionCodes: csvToArray(form.relatedCollections),
        ctaType: form.ctaType,
        ctaText: form.ctaText,
        ctaUrl: form.ctaUrl,
        publishedAt:
          status === "published"
            ? form.publishedAt
              ? new Date(form.publishedAt).toISOString()
              : undefined
            : status === "draft"
              ? null
              : undefined,
        scheduledFor:
          status === "scheduled" && form.scheduledFor
            ? new Date(form.scheduledFor).toISOString()
            : undefined,
      };
      const res = await fetch(`/api/blog/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setToast(body?.message ?? "Save failed.");
        return;
      }
      set("status", status);
      setToast("Saved.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-navy">Edit Post</h1>
        <div className="flex items-center gap-2">
          {toast && <span className="text-sm text-[#6B7280]">{toast}</span>}
          <Button variant="outline" asChild>
            <a href={`/blog/${form.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 size-4" /> Preview
            </a>
          </Button>
          <Button variant="outline" onClick={() => save("draft")} disabled={busy}>
            Save Draft
          </Button>
          {form.status === "scheduled" ? (
            <Button onClick={() => save("scheduled")} disabled={busy}>
              Schedule
            </Button>
          ) : (
            <Button onClick={() => save("published")} disabled={busy}>
              {busy ? "Saving…" : "Publish"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Editor */}
        <div className="space-y-4 lg:col-span-2">
          <Input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Post title"
            className="h-auto border-0 px-0 font-heading text-2xl font-bold text-navy shadow-none focus-visible:ring-0"
          />

          <div>
            <Textarea
              value={form.excerpt}
              onChange={(e) => set("excerpt", e.target.value.slice(0, 200))}
              placeholder="Excerpt (max 200 characters)"
              rows={2}
            />
            <p className="mt-1 text-right text-xs text-[#9CA3AF]">
              {form.excerpt.length}/200
            </p>
          </div>

          <Tabs defaultValue="write">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="write">Write</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-1">
                <ToolbarBtn onClick={() => wrap("**", "**", "bold")} title="Bold">
                  <Bold className="size-4" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => wrap("_", "_", "italic")} title="Italic">
                  <Italic className="size-4" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => wrap("\n## ", "", "Heading")} title="H2">
                  <Heading2 className="size-4" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => wrap("\n### ", "", "Heading")} title="H3">
                  <Heading3 className="size-4" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => wrap("[", "](https://)", "link text")} title="Link">
                  <Link2 className="size-4" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => wrap("\n![", "](https://)", "alt text")} title="Image">
                  <ImageIcon className="size-4" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => wrap("\n- ", "", "List item")} title="List">
                  <List className="size-4" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => wrap("\n> ", "", "Quote")} title="Quote">
                  <Quote className="size-4" />
                </ToolbarBtn>
              </div>
            </div>

            <TabsContent value="write" className="mt-3">
              <Textarea
                ref={textareaRef}
                value={form.content}
                onChange={(e) => set("content", e.target.value)}
                rows={26}
                className="font-mono text-sm leading-relaxed"
                placeholder="Write your article in Markdown…"
              />
            </TabsContent>
            <TabsContent value="preview" className="mt-3">
              <div className="rounded-card border border-border p-6">
                <BlogContent content={form.content} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Settings */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-[#EDE9E3] bg-white p-5 shadow-sm">
            <BlogSettings form={form} set={set} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="rounded-md p-1.5 text-[#6B7280] transition-colors hover:bg-secondary hover:text-navy"
    >
      {children}
    </button>
  );
}
