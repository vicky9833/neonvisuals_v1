"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * P9d (R1) — company branding form. Writes logo_url (https+image, hardened server-side) + brand
 * colors (hex) via PATCH /api/auth/company (settings.manage-gated). Branding renders in the org's
 * OWN dashboard portal shell; a null value falls back to the NEON identity. Not on Neon-issued
 * seller PDFs / outbound emails (ruled).
 */
export function BrandingForm({
  initial,
}: {
  initial: { logo_url: string; brand_primary: string; brand_accent: string };
}) {
  const [logoUrl, setLogoUrl] = useState(initial.logo_url);
  const [primary, setPrimary] = useState(initial.brand_primary);
  const [accent, setAccent] = useState(initial.brand_accent);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch("/api/auth/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo_url: logoUrl, brand_primary: primary, brand_accent: accent }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(json?.message ?? "Could not save. Check the logo URL (https image) and hex colors.");
        return;
      }
      setStatus("saved");
      setMessage("Branding saved. It appears in your dashboard.");
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Branding</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="logo_url" className="text-sm font-medium text-navy">Logo URL</label>
            <input
              id="logo_url"
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://cdn.yourco.com/logo.png"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gold"
            />
            <p className="text-xs text-muted-foreground">https image only (.png/.jpg/.webp/.gif/.svg). Leave blank for the Neon Visuals default.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="brand_primary" className="text-sm font-medium text-navy">Primary color</label>
              <input
                id="brand_primary"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                placeholder="#1A1A2E"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gold"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="brand_accent" className="text-sm font-medium text-navy">Accent color</label>
              <input
                id="brand_accent"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                placeholder="#C4A35A"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gold"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={status === "saving"}
              className="rounded-full bg-navy px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:opacity-60"
            >
              {status === "saving" ? "Saving…" : "Save branding"}
            </button>
            {message ? (
              <span className={status === "error" ? "text-sm text-[#7C2D36]" : "text-sm text-[#2D6A4F]"}>{message}</span>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
