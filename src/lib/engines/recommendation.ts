import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PRODUCTS } from "@/lib/catalog";
import type { BucketCode, Product } from "@/lib/types/product";
import type { GiftRecommendation } from "@/types/gift";
import {
  getEmployeePreferences,
  getEmployeeGiftHistory,
  getProductsToAvoid,
} from "@/lib/engines/memory";

/**
 * Rules-based recommendation engine. At ~120 products, curated scoring beats
 * ML. Excludes duplicates + avoided products, then scores by occasion fit,
 * archetype match, wow factor, desk-test affinity, and variety.
 */

const OCCASION_COLLECTION: Record<string, BucketCode> = {
  onboarding: "A",
  birthday: "I",
  work_anniversary: "B",
  festive: "D",
  festival: "D",
  recognition: "C",
  client: "E",
  custom: "I",
};

const ARCHETYPE_COLLECTIONS: Record<string, BucketCode[]> = {
  achiever: ["B", "C"],
  creator: ["I", "G"],
  explorer: ["I", "D"],
  builder: ["A", "H"],
  root: ["D", "H"],
  connector: ["D", "I"],
  scholar: ["A", "C"],
  minimalist: ["H", "K"],
};

function monthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

export async function getRecommendations(params: {
  employeeId: string;
  occasion: string;
  budget?: "low" | "medium" | "high" | "premium";
  count?: number;
}): Promise<GiftRecommendation[]> {
  const { employeeId, occasion, count = 6 } = params;

  const [avoid, prefs, history] = await Promise.all([
    getProductsToAvoid(employeeId),
    getEmployeePreferences(employeeId),
    getEmployeeGiftHistory(employeeId),
  ]);
  const avoidSet = new Set(avoid);
  const archetype = prefs?.archetype ?? null;
  const deskScore = prefs?.desk_test_score ?? 0;
  const collectionsReceived = new Set(prefs?.preferred_collections ?? []);
  const lastCollection = history[0]?.collection_code ?? null;

  // Department-recency penalty: SKUs sent to the same department recently.
  const supabase = await createClient();
  const { data: emp } = await supabase
    .from("employees")
    .select("company_id, department")
    .eq("id", employeeId)
    .maybeSingle();
  const recentDeptSkus = new Set<string>();
  if (emp?.department && emp.company_id) {
    const { data: recent } = await supabase
      .from("gift_records")
      .select("product_sku, employees!inner(department)")
      .eq("company_id", emp.company_id)
      .gte("gifted_date", monthsAgo(2))
      .eq("employees.department", emp.department);
    for (const r of recent ?? []) recentDeptSkus.add(r.product_sku as string);
  }

  const occasionCollection = OCCASION_COLLECTION[occasion] ?? null;
  const archetypeCollections = archetype
    ? (ARCHETYPE_COLLECTIONS[archetype] ?? [])
    : [];

  const scored: GiftRecommendation[] = [];

  for (const product of PRODUCTS) {
    if (avoidSet.has(product.sku)) continue; // hard exclude duplicates/avoided

    let score = 0;
    const reasons: string[] = [];
    const warnings: string[] = [];

    if (occasionCollection && product.bucket === occasionCollection) {
      score += 20;
      reasons.push("ideal for this occasion");
    }
    if (archetypeCollections.includes(product.bucket)) {
      score += 15;
      reasons.push(`matches their ${archetype} archetype`);
    }
    if ((product.wowScore ?? 0) >= 8) {
      score += 10;
      reasons.push("high wow factor");
    }
    if ((product.tags ?? []).includes("desk-test") && deskScore >= 70) {
      score += 10;
      reasons.push("a proven desk-keeper");
    }
    if (!collectionsReceived.has(product.bucket)) {
      score += 10;
      reasons.push("a collection they haven't received yet");
    }
    if (product.isNew) {
      score += 5;
      reasons.push("newly added");
    }
    if (lastCollection && product.bucket === lastCollection) {
      score -= 10;
      warnings.push("same collection as their last gift");
    }
    if (recentDeptSkus.has(product.sku)) {
      score -= 5;
      warnings.push("recently sent to their department");
    }

    if (score <= 0) continue;

    const reason =
      reasons.length > 0
        ? `${capitalize(reasons[0])}${reasons.length > 1 ? `, ${reasons.slice(1, 3).join(", ")}` : ""}.`
        : "A solid choice for this occasion.";

    scored.push({
      sku: product.sku,
      name: product.name,
      collection: product.bucket,
      imageUrl: product.imageUrl,
      score: Math.min(100, score),
      reason,
      warnings,
    });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, count);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Static, catalog-only recommender for the public occasion/budget endpoint
 * (no employee memory). Filters by occasion + optional max budget, ranks by
 * wow factor. Public catalog data is price-free, so the budget filter only
 * applies to products that carry an internal basePrice.
 */
export function recommendProducts(params: {
  occasion?: string;
  maxBudget?: number;
}): Product[] {
  const { occasion, maxBudget } = params;
  let list = [...PRODUCTS];
  if (occasion) {
    const matched = list.filter((p) => (p.occasions ?? []).includes(occasion));
    if (matched.length > 0) list = matched;
  }
  if (typeof maxBudget === "number") {
    list = list.filter(
      (p) => p.basePrice === undefined || p.basePrice <= maxBudget,
    );
  }
  return list
    .sort((a, b) => (b.wowScore ?? 0) - (a.wowScore ?? 0))
    .slice(0, 8);
}
