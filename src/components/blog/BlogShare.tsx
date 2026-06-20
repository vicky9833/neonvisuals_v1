"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

interface BlogShareProps {
  path: string; // e.g. /blog/my-post
  title: string;
}

export function BlogShare({ path, title }: BlogShareProps) {
  const [copied, setCopied] = useState(false);

  function absoluteUrl(): string {
    if (typeof window !== "undefined") {
      return `${window.location.origin}${path}`;
    }
    return path;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(absoluteUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  function open(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const enc = (s: string) => encodeURIComponent(s);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-[#6B7280]">Share:</span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-navy transition-colors hover:bg-secondary"
      >
        {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
        {copied ? "Copied" : "Copy Link"}
      </button>
      <button
        type="button"
        onClick={() =>
          open(`https://www.linkedin.com/sharing/share-offsite/?url=${enc(absoluteUrl())}`)
        }
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-navy transition-colors hover:bg-secondary"
        aria-label="Share on LinkedIn"
      >
        <Share2 className="size-4" /> LinkedIn
      </button>
      <button
        type="button"
        onClick={() =>
          open(`https://twitter.com/intent/tweet?url=${enc(absoluteUrl())}&text=${enc(title)}`)
        }
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-navy transition-colors hover:bg-secondary"
        aria-label="Share on X"
      >
        <Share2 className="size-4" /> X
      </button>
      <button
        type="button"
        onClick={() =>
          open(`https://wa.me/?text=${enc(`${title} ${absoluteUrl()}`)}`)
        }
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-navy transition-colors hover:bg-secondary"
        aria-label="Share on WhatsApp"
      >
        WhatsApp
      </button>
    </div>
  );
}
