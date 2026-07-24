/**
 * City / state-name -> GST state code lookup. Pure, dependency-free, ASCII-only.
 *
 * Used ONLY as a low-confidence fallback when a buyer has no valid GSTIN: a city or state string
 * is mapped to its state code so the supply type (intra vs inter) can still be decided. A valid
 * GSTIN always wins over this (see resolveSupplyDecision in billing.ts). On any unrecognised input
 * we return null and NEVER guess -- the caller then treats the place of supply as unresolved.
 *
 * Matching is case- and whitespace-insensitive and tolerates compound inputs such as
 * "Bangalore, Karnataka" or "Mumbai - 400093" by matching a recognised token/phrase; pincode
 * (pure-digit) tokens are ignored. Every value here MUST be a state code that exists in
 * state-codes.ts (asserted by the test).
 */
import { type StateCode } from "./state-codes";

/**
 * Alias (normalized, lowercased) -> state code. Includes major Indian business cities, their
 * common alternate spellings, and the bare state names for the covered states. Multi-word aliases
 * (e.g. "new delhi", "navi mumbai", "tamil nadu") are matched as contiguous phrases.
 */
const ALIAS_TO_STATE_CODE: Readonly<Record<string, StateCode>> = {
  // 29 Karnataka
  bangalore: "29",
  bengaluru: "29",
  mysore: "29",
  mysuru: "29",
  mangalore: "29",
  mangaluru: "29",
  hubli: "29",
  belgaum: "29",
  belagavi: "29",
  karnataka: "29",

  // 27 Maharashtra
  mumbai: "27",
  bombay: "27",
  "navi mumbai": "27",
  thane: "27",
  pune: "27",
  nagpur: "27",
  nashik: "27",
  aurangabad: "27",
  maharashtra: "27",

  // 07 Delhi
  delhi: "07",
  "new delhi": "07",

  // 06 Haryana
  gurgaon: "06",
  gurugram: "06",
  faridabad: "06",
  haryana: "06",

  // 09 Uttar Pradesh
  noida: "09",
  "greater noida": "09",
  ghaziabad: "09",
  lucknow: "09",
  kanpur: "09",
  "uttar pradesh": "09",

  // 36 Telangana
  hyderabad: "36",
  secunderabad: "36",
  telangana: "36",

  // 33 Tamil Nadu
  chennai: "33",
  madras: "33",
  coimbatore: "33",
  madurai: "33",
  "tamil nadu": "33",

  // 19 West Bengal
  kolkata: "19",
  calcutta: "19",
  "west bengal": "19",

  // 24 Gujarat
  ahmedabad: "24",
  surat: "24",
  vadodara: "24",
  baroda: "24",
  rajkot: "24",
  gandhinagar: "24",
  gujarat: "24",

  // 08 Rajasthan
  jaipur: "08",
  rajasthan: "08",

  // 04 Chandigarh
  chandigarh: "04",

  // 32 Kerala
  kochi: "32",
  cochin: "32",
  ernakulam: "32",
  thiruvananthapuram: "32",
  trivandrum: "32",
  kerala: "32",

  // 23 Madhya Pradesh
  indore: "23",
  bhopal: "23",
  "madhya pradesh": "23",

  // 21 Odisha
  bhubaneswar: "21",
  odisha: "21",
  orissa: "21",

  // 10 Bihar
  patna: "10",
  bihar: "10",

  // 18 Assam
  guwahati: "18",
  assam: "18",

  // 30 Goa
  goa: "30",
  panaji: "30",
  panjim: "30",

  // 05 Uttarakhand
  dehradun: "05",
  uttarakhand: "05",

  // 22 Chhattisgarh
  raipur: "22",
  chhattisgarh: "22",

  // 20 Jharkhand
  ranchi: "20",
  jharkhand: "20",

  // 03 Punjab
  amritsar: "03",
  ludhiana: "03",
  punjab: "03",

  // 37 Andhra Pradesh
  visakhapatnam: "37",
  vizag: "37",
  vijayawada: "37",
  "andhra pradesh": "37",
};

/** The longest alias phrase length (in words) we need to consider when scanning tokens. */
const MAX_PHRASE_WORDS = 2;

/** Lowercase, replace any non-alphanumeric run with a single space, collapse + trim. */
function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Map a city or state string to its GST state code, or null if unrecognised.
 * Never guesses: an input with no recognised token returns null.
 */
export function cityToStateCode(city: string | null | undefined): StateCode | null {
  if (city == null) return null;
  const norm = normalize(city);
  if (norm === "") return null;

  // 1. Whole-string exact match (handles single- and multi-word aliases directly).
  const whole = ALIAS_TO_STATE_CODE[norm];
  if (whole !== undefined) return whole;

  // 2. Token / phrase scan. Drop pure-digit tokens (pincodes). Try longer phrases first so a
  //    multi-word alias wins over any single word it contains.
  const words = norm.split(" ").filter((w) => w !== "" && !/^\d+$/.test(w));
  for (let n = MAX_PHRASE_WORDS; n >= 1; n -= 1) {
    for (let i = 0; i + n <= words.length; i += 1) {
      const phrase = words.slice(i, i + n).join(" ");
      const code = ALIAS_TO_STATE_CODE[phrase];
      if (code !== undefined) return code;
    }
  }
  return null;
}

/** All alias keys (for tests / introspection). */
export function knownCityAliases(): string[] {
  return Object.keys(ALIAS_TO_STATE_CODE);
}
