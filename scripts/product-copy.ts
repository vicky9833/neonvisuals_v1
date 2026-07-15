/**
 * Authored premium brand-voice copy for the product catalogue.
 *
 * `tagline` and `description` cannot be produced deterministically at premium
 * quality, so they are authored here (LLM-assisted with human review against
 * `.kiro/steering/brand.md`) and merged into the generated catalogue by SKU.
 *
 * Brand voice (see steering/brand.md):
 *   - warm, premium, benefit-focused
 *   - "experience kit" not "hamper" | "investment" not "cost"
 *   - "designed for Priya" not "customisable"
 *   - NEVER: "cheapest", "bulk discount", "one-stop shop"
 *
 * CRITICAL: Prices are NEVER shown publicly. No `tagline` or `description`
 * (authored or fallback) may contain a price, currency amount, or cost figure
 * (Requirement 11.3). The price-token guard below enforces this at generation
 * time and fails the run on any violation.
 *
 * Requirements: 11.1, 11.2, 11.3
 */

/** Authored one-line short description + 2–3 sentence premium description. */
export interface ProductCopy {
  /** One-line, warm, benefit-focused short description (Requirement 11.1). */
  tagline: string;
  /** Two to three sentences referencing personalisation, use case, or material (Requirement 11.2). */
  description: string;
}

/**
 * Authored copy keyed by the deterministic SKU (`NV-<LETTER>-<NNN>`) the
 * generator assigns. SKUs without an entry fall back to a safe, non-empty
 * brand-voice description via {@link getProductCopy}, and are flagged in the
 * generation run log for follow-up authoring.
 *
 * For cross-collection duplicates (Requirement 15.3) each SKU carries its own
 * distinct copy so the same physical product reads differently per collection.
 */
export const PRODUCT_COPY: Record<string, ProductCopy> = {
  /* Collection A — Welcome & Onboarding (onboarding kits) */
  "NV-A-001": {
    tagline: "The first thing they carry to work",
    description:
      "A structured canvas backpack with a quiet, premium finish, embroidered with each new joiner's name so day one feels personal from the moment they arrive. Built for the commute, the laptop, and the everyday carry of a growing career. A grounding piece for onboarding kits that says you belong here.",
  },
  "NV-A-002": {
    tagline: "A daily ritual that carries their name",
    description:
      "A double-wall copper bottle, laser engraved with each teammate's name, warm and tactile and made to earn a permanent spot on the desk. It turns a routine sip of water into a small, repeated reminder that they were welcomed with intention. A quietly premium anchor for any onboarding kit.",
  },
  "NV-A-003": {
    tagline: "Cool, clean, and unmistakably theirs",
    description:
      "A vacuum-sealed stainless steel bottle in a brushed silver finish, laser engraved with the recipient's name for a mark that never fades. It keeps up through back-to-back meetings and long focus sessions alike. Designed for onboarding kits that make a strong, considered first impression.",
  },

  /* Collection B — Milestone & Anniversary (milestone celebrations) */
  "NV-B-001": {
    tagline: "Raise a glass to the years they gave",
    description:
      "A handcrafted copper bar set, laser engraved with a name and the milestone year, made for the evening a long tenure is finally toasted. Each piece warms with use and keeps its story on the shelf. Designed for milestone celebrations that deserve to be marked, not mentioned in passing.",
  },
  "NV-B-002": {
    tagline: "Their moment, held in light",
    description:
      "An optical crystal award, laser engraved beneath the surface with a name and date so the achievement sits suspended in glass. It catches the light on a desk long after the applause fades. Designed for milestone celebrations and the anniversaries that define a career.",
  },
  "NV-B-003": {
    tagline: "Years of work, carried in full-grain leather",
    description:
      "A full-grain leather bag, debossed with the recipient's initials for a mark that softens and deepens with every year of use. It ages the way a great tenure does, gaining character rather than losing it. A milestone celebration piece designed to travel far beyond the office.",
  },

  /* Collection C — CEO & Leadership Recognition (leadership recognition) */
  "NV-C-001": {
    tagline: "A leader's achievement, cast to last",
    description:
      "A gold-finished achievement coin, laser engraved with a name and honour and cradled in a soft velvet case that opens like a private moment. Weighty in the hand, it carries the gravity of genuine recognition. Designed for leadership recognition and the milestones that shape an organisation.",
  },
  "NV-C-002": {
    tagline: "The world, and their name at its base",
    description:
      "A brass desk globe set on a solid name base, laser engraved to honour a leader whose vision reaches wide. It brings quiet authority to any executive desk. Designed for leadership recognition that feels earned rather than issued.",
  },
  "NV-C-003": {
    tagline: "Press play on a personal tribute",
    description:
      "A clear acrylic stand with UV printing and a scannable code that opens a personal video message, pairing crafted material with a human moment. It holds a leader's story in a form as modern as their thinking. Designed for leadership recognition that goes beyond the plaque.",
  },

  /* Collection D — Festive & Seasonal (festival gifting) */
  "NV-D-001": {
    tagline: "Warm light for the festive season",
    description:
      "A folding wooden book lamp, laser engraved with a name along the spine, that opens into a soft glow for the season of celebration. It brings warmth to a desk or bedside long after the festival passes. Designed for festival gifting that feels considered rather than seasonal filler.",
  },
  "NV-D-002": {
    tagline: "A festive pour, personalised",
    description:
      "A tabletop glass beverage dispenser, UV printed with a name and festive motif, made for the gatherings that define the season. It turns a shared toast into a moment that carries someone's name. Designed for festival gifting that hosts as warmly as the people who receive it.",
  },
  "NV-D-003": {
    tagline: "A calendar that never runs out of festive cheer",
    description:
      "A 3D printed perpetual calendar, UV printed with a name and seasonal detail, that resets each year so the festive spirit keeps returning. It sits neatly on a desk as a small, personal marker of time. Designed for festival gifting that lasts well past the holidays.",
  },

  /* Collection E — Client Appreciation (client appreciation) */
  "NV-E-001": {
    tagline: "A slow ritual, shared with a valued client",
    description:
      "An artisanal ceramic tea and coffee set, UV printed with a name or logo, made for the unhurried mornings where good relationships are built. Each glazed piece feels handmade and holds warmth beautifully. Designed for client appreciation that deepens the partnership one cup at a time.",
  },
  "NV-E-002": {
    tagline: "Their name, at the heart of the desk",
    description:
      "A solid brass pen stand, laser engraved with a name, that gives a client's desk a point of quiet permanence. It elevates the everyday act of picking up a pen. Designed for client appreciation that stays in view long after the meeting ends.",
  },
  "NV-E-003": {
    tagline: "The city where the relationship began",
    description:
      "A framed city map art print, UV printed and personalised with a name, place, and date that mark a shared beginning. Set behind clean glass in a premium frame, it turns a business address into a story. Designed for client appreciation that celebrates the partnership, not the transaction.",
  },

  /* Collection F — Experience Kits (onboarding kits & curated experiences) */
  "NV-F-001": {
    tagline: "A curated experience, made for one person",
    description:
      "A thoughtfully composed experience kit of premium pieces, laser engraved and embroidered with the recipient's name across leather, metal, and fabric elements. Every layer is arranged for a memorable unboxing moment that unfolds like a story. Designed for onboarding kits and the milestones worth curating end to end.",
  },

  /* Collection G — Tech-Forward & Digital (tech-forward gifting) */
  "NV-G-001": {
    tagline: "Modern desk tech, personally marked",
    description:
      "A sleek anodised aluminium tech accessory, laser engraved with a name for a finish as clean as the hardware it sits beside. It brings order and a personal signature to a connected workspace. Designed for tech-forward gifting that feels current, useful, and genuinely theirs.",
  },

  /* Collection H — Sustainability & Eco (eco-conscious gifting) */
  "NV-H-001": {
    tagline: "Zero-waste dining, made personal",
    description:
      "A travel cutlery set crafted from sustainably grown bamboo, laser engraved with a name for a mark that needs no ink. Lightweight and reusable, it replaces single-use plastic on every commute and desk lunch. Designed for eco-conscious gifting that carries real intent, not just a green label.",
  },
  "NV-H-002": {
    tagline: "Fresh thinking, wrapped in beeswax",
    description:
      "A set of three organic cotton beeswax wraps, embroidered with a name, that replace cling film with something reusable and beautifully tactile. They soften in the hand and seal with warmth, season after season. Designed for eco-conscious gifting that makes sustainability feel like a pleasure, not a compromise.",
  },
  "NV-H-003": {
    tagline: "Packaging that gives back to the earth",
    description:
      "A compostable packaging set made from plant-based bagasse and kraft, UV printed with a name and message using low-impact inks. It carries a gift beautifully and then returns to the soil rather than the landfill. Designed for eco-conscious gifting where every layer reflects the values behind it.",
  },

  /* Collection I — Events & General Gifts (event & general gifting) */
  "NV-I-001": {
    tagline: "A year on the desk, personalised",
    description:
      "A 3D printed desk calendar, UV printed with a name and event detail, that keeps a memorable occasion in view all year. Its sculpted form makes it as much an object as an organiser. Designed for event gifting that outlasts the day itself.",
  },
  "NV-I-002": {
    tagline: "Hold the memories, not just the photos",
    description:
      "A 3D printed photo album with a debossed name on the cover, made to gather the moments an event leaves behind. The tactile finish invites people to return to it again and again. Designed for event and general gifting that turns a gathering into a keepsake.",
  },
  "NV-I-003": {
    tagline: "A quiet glow that carries their name",
    description:
      "A laser-cut wooden book lamp, laser engraved with a name, that folds open into a warm ambient light. It brings a soft, personal presence to any room or desk. Designed for event and general gifting that feels crafted rather than off the shelf.",
  },

  /* Collection J — College Events (student & campus gifting) */
  "NV-J-001": {
    tagline: "A place for every idea, marked as theirs",
    description:
      "A premium bound diary in a supple leatherette cover, debossed with a name for a mark that stays sharp through a busy year. Its lay-flat pages are made for lectures, plans, and late-night ideas alike. Designed for campus event gifting that students actually keep and use.",
  },
  "NV-J-002": {
    tagline: "Campus pride, worn with their name",
    description:
      "A soft brushed-fleece hoodie, embroidered with a name for a finish that holds through every wash and every winter. It becomes the piece they reach for on the walk across campus. Designed for college event gifting that builds a real sense of belonging.",
  },
  "NV-J-003": {
    tagline: "Their screen, held at the perfect angle",
    description:
      "A minimalist wooden phone stand, laser engraved with a name, that keeps a device propped and ready through study sessions and video calls. It brings a touch of warmth to a desk full of tech. Designed for college event gifting that stays useful long after graduation.",
  },

  /* Collection K — Visiting Cards & Business Stationery (client appreciation & networking) */
  "NV-K-001": {
    tagline: "A first impression, engraved to last",
    description:
      "A premium metal visiting card, laser engraved with a name and title for an introduction that feels weighty and considered. Handed across a table, it turns a routine exchange into something memorable. Designed for client appreciation and the networking moments that open doors.",
  },
};

/**
 * Patterns that indicate price / currency / cost information. Any match in a
 * tagline or description is a Requirement 11.3 violation.
 *
 * Covers the rupee symbol, `Rs`/`INR` currency prefixes, other currency
 * symbols, the Indian `/-` amount notation, spelled-out currency words, and
 * explicit price/cost vocabulary.
 */
const PRICE_TOKEN_PATTERNS: readonly { readonly name: string; readonly regex: RegExp }[] = [
  { name: "rupee-symbol", regex: /₹/ },
  { name: "inr-code", regex: /\bINR\b/i },
  { name: "rs-amount", regex: /\bRs\.?\s*\d/i },
  { name: "currency-symbol-amount", regex: /[$€£¥]\s*\d/ },
  { name: "indian-slash-notation", regex: /\d\s*\/-/ },
  { name: "amount-with-currency-word", regex: /\b\d[\d,]*(?:\.\d+)?\s*(?:rupees?|dollars?|usd|inr|paise|cents?)\b/i },
  { name: "currency-word", regex: /\b(?:rupees?|dollars?|usd|paise)\b/i },
  { name: "price-vocabulary", regex: /\b(?:price[ds]?|pricing|cost[s]?|costing|discount[s]?|cheap(?:est|er)?)\b/i },
];

/** A single detected price-token violation. */
export interface PriceTokenViolation {
  /** The name of the pattern that matched. */
  pattern: string;
  /** The offending substring from the scanned text. */
  match: string;
}

/**
 * Scan a single string for price / currency / cost tokens.
 *
 * @returns every violation found (empty when the text is price-free).
 */
export function findPriceTokens(text: string): PriceTokenViolation[] {
  const violations: PriceTokenViolation[] = [];
  for (const { name, regex } of PRICE_TOKEN_PATTERNS) {
    const found = text.match(regex);
    if (found) {
      violations.push({ pattern: name, match: found[0] });
    }
  }
  return violations;
}

/** True when the text contains any price / currency / cost token. */
export function containsPriceToken(text: string): boolean {
  return PRICE_TOKEN_PATTERNS.some(({ regex }) => regex.test(text));
}

/**
 * Price-token guard for a single SKU's copy. Throws a descriptive error when
 * the tagline or description contains price information, failing generation
 * (Requirement 11.3). Reusable and independently testable.
 */
export function assertCopyPriceFree(sku: string, copy: ProductCopy): void {
  const problems: { field: "tagline" | "description"; violations: PriceTokenViolation[] }[] = [];

  const taglineViolations = findPriceTokens(copy.tagline);
  if (taglineViolations.length > 0) {
    problems.push({ field: "tagline", violations: taglineViolations });
  }

  const descriptionViolations = findPriceTokens(copy.description);
  if (descriptionViolations.length > 0) {
    problems.push({ field: "description", violations: descriptionViolations });
  }

  if (problems.length > 0) {
    const detail = problems
      .map(
        (p) =>
          `${p.field} (${p.violations.map((v) => `${v.pattern}: "${v.match}"`).join(", ")})`,
      )
      .join("; ");
    throw new Error(
      `Price-token guard failed for ${sku}: copy must never contain price, currency, or cost information — found in ${detail}. Prices are never shown publicly (Requirement 11.3).`,
    );
  }
}

/**
 * Generation-time guard over the entire authored copy map. Throws on the first
 * SKU whose copy contains price information. Call this before emitting the
 * catalogue so a violation fails the run.
 */
export function assertAllCopyPriceFree(
  copyMap: Record<string, ProductCopy> = PRODUCT_COPY,
): void {
  for (const [sku, copy] of Object.entries(copyMap)) {
    assertCopyPriceFree(sku, copy);
  }
}

/** Generic, guaranteed price-free label used when a name cannot be sanitised. */
const GENERIC_LABEL = "This piece";

/**
 * Turn a slug or raw folder-derived name into a human-readable label for use in
 * fallback copy (e.g. "copper-bottle" -> "Copper Bottle").
 *
 * The label is sanitised so it can NEVER carry price information into the
 * fallback copy (Requirement 11.3): every character outside letters, digits and
 * spaces is dropped (removing currency symbols such as `₹ $ € £ ¥` and the
 * Indian `/-` notation), and any residual price/currency vocabulary word is
 * removed. If nothing safe remains, a {@link GENERIC_LABEL} is used.
 */
function humaniseName(name: string): string {
  const cleaned = name
    .replace(/[^A-Za-z0-9 ]+/g, " ") // drop currency symbols, slashes, punctuation
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length === 0) {
    return GENERIC_LABEL;
  }

  // Remove any residual price/currency vocabulary tokens so the label itself is
  // guaranteed price-free regardless of the source name.
  const safeWords = cleaned
    .split(" ")
    .filter((word) => word.length > 0 && !containsPriceToken(word));
  if (safeWords.length === 0) {
    return GENERIC_LABEL;
  }

  return safeWords
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Build a safe, non-empty brand-voice fallback for a SKU without authored copy
 * (Requirement 11.2). Never contains price information (Requirement 11.3): the
 * name is sanitised by {@link humaniseName}, and a final defensive guard falls
 * back to a fully generic, name-free copy if any price token still slips
 * through, so the output is price-free by construction for ANY input.
 */
export function buildFallbackCopy(name: string, collectionDisplayName?: string): ProductCopy {
  const rawCollection = collectionDisplayName?.trim() ?? "";
  const collection = containsPriceToken(rawCollection) ? "" : rawCollection;
  const label = humaniseName(name);
  const collectionClause = collection ? ` from our ${collection} collection` : "";

  const copy: ProductCopy = {
    tagline: `${label} - designed to be remembered`,
    description:
      `A premium, personalised ${label.toLowerCase()}${collectionClause}, made to carry each recipient's name and a message that lasts. ` +
      `Thoughtfully finished and packaged for a memorable unboxing moment, so every teammate feels genuinely seen.`,
  };

  // Defensive guarantee: if anything above still reads as a price token, drop
  // the derived label entirely and use a fully generic, price-free copy.
  if (containsPriceToken(copy.tagline) || containsPriceToken(copy.description)) {
    return {
      tagline: `${GENERIC_LABEL} - designed to be remembered`,
      description:
        `A premium, personalised keepsake, made to carry each recipient's name and a message that lasts. ` +
        `Thoughtfully finished and packaged for a memorable unboxing moment, so every teammate feels genuinely seen.`,
    };
  }

  return copy;
}

/**
 * Resolve the copy for a SKU: the authored entry when present, otherwise a safe
 * non-empty brand-voice fallback derived from the product name and collection.
 *
 * The returned copy is always guaranteed price-free — authored entries are
 * validated by {@link assertAllCopyPriceFree} at generation time, and the
 * fallback is price-free by construction.
 *
 * @param sku - the product SKU (`NV-<LETTER>-<NNN>`).
 * @param name - the product's display or folder-derived name (for fallback).
 * @param collectionDisplayName - optional collection name for fallback context.
 * @returns the resolved {@link ProductCopy} and whether a fallback was used.
 */
export function getProductCopy(
  sku: string,
  name: string,
  collectionDisplayName?: string,
): { copy: ProductCopy; usedFallback: boolean } {
  const authored = PRODUCT_COPY[sku];
  if (authored) {
    return { copy: authored, usedFallback: false };
  }
  return { copy: buildFallbackCopy(name, collectionDisplayName), usedFallback: true };
}
