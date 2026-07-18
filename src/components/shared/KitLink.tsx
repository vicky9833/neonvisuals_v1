"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuthProfile } from "@/lib/use-auth-profile";
import { useCartStore } from "@/lib/stores/cart-store";

/**
 * P9d (R2↔R3) — header "Curate a Kit" link with a live kit-count badge, plus anonymous→authed merge.
 * Anonymous visitors: badge = the client (Zustand) kit count. On login, the anonymous kit is MERGED
 * into the user's persisted kit (POST /api/kit action=merge, union + qty summed/capped server-side),
 * the local store is cleared, and the badge then reflects the persisted kit count.
 */
export function KitLink() {
  const { loading, profile } = useAuthProfile();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const localCount = items.reduce((n, i) => n + i.quantity, 0);
  const [serverCount, setServerCount] = useState<number | null>(null);
  const mergedRef = useRef(false);

  useEffect(() => {
    if (loading || !profile) return;
    let active = true;
    async function sync() {
      // Merge the anonymous kit once per session, then read the persisted count.
      if (!mergedRef.current && items.length > 0) {
        mergedRef.current = true;
        try {
          await fetch("/api/kit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "merge",
              items: items.map((i) => ({ productId: i.productId, sku: i.sku, name: i.name, unitPrice: i.unitPrice, quantity: i.quantity })),
            }),
          });
          clear();
        } catch {
          /* non-fatal; badge falls back to local */
        }
      }
      try {
        const res = await fetch("/api/kit");
        const json = await res.json().catch(() => ({}));
        if (active && Array.isArray(json?.data)) {
          setServerCount(json.data.reduce((n: number, i: { quantity: number }) => n + i.quantity, 0));
        }
      } catch {
        /* ignore */
      }
    }
    void sync();
    return () => {
      active = false;
    };
  }, [loading, profile, items, clear]);

  const count = profile && serverCount !== null ? serverCount : localCount;

  return (
    <Link
      href="/gift-builder"
      className="relative hidden h-10 items-center rounded-full border border-gold/50 bg-gold/10 px-5 text-[13px] font-semibold text-navy transition-colors hover:bg-gold/20 md:inline-flex"
    >
      Curate a Kit
      {count > 0 ? (
        <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-navy px-1.5 text-[11px] font-bold text-white">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
