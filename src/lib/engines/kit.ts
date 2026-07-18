import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * P9d (R3) — persistent kit engine.
 *
 * OWNERSHIP (ruled): a kit belongs to a USER, scoped to their company (kit_items keyed
 * company_id + user_id + product_id). All reads/writes go through the RLS client so a user only ever
 * touches their own kit within their own company — another user's kit is invisible (RLS by
 * auth.uid()). Anonymous (client Zustand) kits MERGE on login: union by product_id, quantities
 * summed and capped. The kit feeds 7a quote-request (kit → quote handoff).
 */

export interface KitItemInput {
  productId: string;
  sku: string;
  name: string;
  unitPrice?: number | null;
  quantity: number;
}

export interface KitItem extends KitItemInput {
  id: string;
  quantity: number;
}

const QTY_CAP = 9999;
const clampQty = (n: number) => Math.max(1, Math.min(QTY_CAP, Math.floor(n)));

/** The caller's own kit (RLS-scoped to auth.uid() within their company). */
export async function getKit(client: SupabaseClient, companyId: string, userId: string): Promise<KitItem[]> {
  const { data, error } = await client
    .from("kit_items")
    .select("id, product_id, sku, name, unit_price, quantity")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`getKit: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    productId: r.product_id as string,
    sku: r.sku as string,
    name: r.name as string,
    unitPrice: (r.unit_price as number | null) ?? null,
    quantity: r.quantity as number,
  }));
}

/**
 * Merge an anonymous kit into the user's persisted kit: union by product_id, qty summed (capped).
 * Idempotent per call for the additive semantics (re-merging the same anonymous set sums again — the
 * caller clears the client kit after a successful merge). Returns the resulting kit.
 */
export async function mergeKit(
  client: SupabaseClient,
  companyId: string,
  userId: string,
  incoming: KitItemInput[],
): Promise<KitItem[]> {
  const existing = await getKit(client, companyId, userId);
  const byProduct = new Map<string, KitItem>();
  for (const e of existing) byProduct.set(e.productId, { ...e });
  for (const inc of incoming) {
    if (!inc.productId || inc.quantity <= 0) continue;
    const cur = byProduct.get(inc.productId);
    if (cur) {
      cur.quantity = clampQty(cur.quantity + inc.quantity);
    } else {
      byProduct.set(inc.productId, {
        id: "", productId: inc.productId, sku: inc.sku, name: inc.name,
        unitPrice: inc.unitPrice ?? null, quantity: clampQty(inc.quantity),
      });
    }
  }

  const rows = [...byProduct.values()].map((it) => ({
    company_id: companyId,
    user_id: userId,
    product_id: it.productId,
    sku: it.sku,
    name: it.name,
    unit_price: it.unitPrice ?? null,
    quantity: it.quantity,
  }));
  if (rows.length > 0) {
    const { error } = await client.from("kit_items").upsert(rows, { onConflict: "company_id,user_id,product_id" });
    if (error) throw new Error(`mergeKit upsert: ${error.message}`);
  }
  return getKit(client, companyId, userId);
}

/** Set one item (upsert). */
export async function setKitItem(client: SupabaseClient, companyId: string, userId: string, item: KitItemInput): Promise<void> {
  const { error } = await client.from("kit_items").upsert(
    {
      company_id: companyId, user_id: userId, product_id: item.productId,
      sku: item.sku, name: item.name, unit_price: item.unitPrice ?? null, quantity: clampQty(item.quantity),
    },
    { onConflict: "company_id,user_id,product_id" },
  );
  if (error) throw new Error(`setKitItem: ${error.message}`);
}

/** Remove one item by product_id. */
export async function removeKitItem(client: SupabaseClient, companyId: string, userId: string, productId: string): Promise<void> {
  const { error } = await client.from("kit_items").delete().eq("company_id", companyId).eq("user_id", userId).eq("product_id", productId);
  if (error) throw new Error(`removeKitItem: ${error.message}`);
}

/** Clear the user's kit (e.g. after the quote handoff). */
export async function clearKit(client: SupabaseClient, companyId: string, userId: string): Promise<void> {
  const { error } = await client.from("kit_items").delete().eq("company_id", companyId).eq("user_id", userId);
  if (error) throw new Error(`clearKit: ${error.message}`);
}

/** Kit → 7a quote-request products shape. */
export function kitToQuoteProducts(items: KitItem[]): Array<{ sku: string; quantity: number }> {
  return items.map((i) => ({ sku: i.sku, quantity: i.quantity }));
}
