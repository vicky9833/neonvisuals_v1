/**
 * GST state codes — the first two digits of every GSTIN.
 *
 * Source of truth: CBIC / GST e-invoice master codes
 * (https://einvoice1.gst.gov.in/Others/MasterCodes), cross-checked against the
 * ISO 3166-2:IN subdivision list. Codes 01–38 plus 97 (Other Territory) and
 * 99 (Centre Jurisdiction).
 *
 * Historical notes (verified — see Phase-2 completion report):
 *   - 25 "Daman and Diu" is LEGACY: the UT merged into 26 on 26-Jan-2020.
 *   - 26 is the MERGED UT "Dadra and Nagar Haveli and Daman and Diu" (the GST
 *     e-invoice portal still displays the pre-merger short label "Dadra and
 *     Nagar Haveli" for 26 — same code, updated name).
 *   - 28 "Andhra Pradesh" is LEGACY (pre-Telangana bifurcation). Active AP is 37;
 *     Telangana is 36. The CBIC e-invoice master list omits 28 (jumps 27→29).
 *   - 38 "Ladakh" was added after the 2019 J&K reorganisation.
 *
 * Pure module — no imports, no runtime deps.
 */

export interface GstStateInfo {
  /** Two-digit GST state code, e.g. "27". */
  code: string;
  /** Official state / UT name. */
  name: string;
  /** Two-letter abbreviation (ISO 3166-2:IN subdivision letters where defined). */
  alpha2: string;
  /** True for codes retired/superseded by a boundary or merger change. */
  legacy?: boolean;
}

/** Frozen GST state-code map, keyed by the two-digit code string. */
export const STATE_CODES = Object.freeze({
  "01": { code: "01", name: "Jammu and Kashmir", alpha2: "JK" },
  "02": { code: "02", name: "Himachal Pradesh", alpha2: "HP" },
  "03": { code: "03", name: "Punjab", alpha2: "PB" },
  "04": { code: "04", name: "Chandigarh", alpha2: "CH" },
  "05": { code: "05", name: "Uttarakhand", alpha2: "UT" },
  "06": { code: "06", name: "Haryana", alpha2: "HR" },
  "07": { code: "07", name: "Delhi", alpha2: "DL" },
  "08": { code: "08", name: "Rajasthan", alpha2: "RJ" },
  "09": { code: "09", name: "Uttar Pradesh", alpha2: "UP" },
  "10": { code: "10", name: "Bihar", alpha2: "BR" },
  "11": { code: "11", name: "Sikkim", alpha2: "SK" },
  "12": { code: "12", name: "Arunachal Pradesh", alpha2: "AR" },
  "13": { code: "13", name: "Nagaland", alpha2: "NL" },
  "14": { code: "14", name: "Manipur", alpha2: "MN" },
  "15": { code: "15", name: "Mizoram", alpha2: "MZ" },
  "16": { code: "16", name: "Tripura", alpha2: "TR" },
  "17": { code: "17", name: "Meghalaya", alpha2: "ML" },
  "18": { code: "18", name: "Assam", alpha2: "AS" },
  "19": { code: "19", name: "West Bengal", alpha2: "WB" },
  "20": { code: "20", name: "Jharkhand", alpha2: "JH" },
  "21": { code: "21", name: "Odisha", alpha2: "OD" },
  "22": { code: "22", name: "Chhattisgarh", alpha2: "CG" },
  "23": { code: "23", name: "Madhya Pradesh", alpha2: "MP" },
  "24": { code: "24", name: "Gujarat", alpha2: "GJ" },
  "25": { code: "25", name: "Daman and Diu", alpha2: "DD", legacy: true },
  "26": { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu", alpha2: "DH" },
  "27": { code: "27", name: "Maharashtra", alpha2: "MH" },
  "28": { code: "28", name: "Andhra Pradesh", alpha2: "AP", legacy: true },
  "29": { code: "29", name: "Karnataka", alpha2: "KA" },
  "30": { code: "30", name: "Goa", alpha2: "GA" },
  "31": { code: "31", name: "Lakshadweep", alpha2: "LD" },
  "32": { code: "32", name: "Kerala", alpha2: "KL" },
  "33": { code: "33", name: "Tamil Nadu", alpha2: "TN" },
  "34": { code: "34", name: "Puducherry", alpha2: "PY" },
  "35": { code: "35", name: "Andaman and Nicobar Islands", alpha2: "AN" },
  "36": { code: "36", name: "Telangana", alpha2: "TG" },
  "37": { code: "37", name: "Andhra Pradesh", alpha2: "AP" },
  "38": { code: "38", name: "Ladakh", alpha2: "LA" },
  "97": { code: "97", name: "Other Territory", alpha2: "OT" },
  "99": { code: "99", name: "Centre Jurisdiction", alpha2: "CE" },
} as const satisfies Record<string, GstStateInfo>);

/** Union of every valid two-digit GST state code. */
export type StateCode = keyof typeof STATE_CODES;

/** True when `s` is a recognised GST state code. */
export function isValidStateCode(s: string): s is StateCode {
  return Object.prototype.hasOwnProperty.call(STATE_CODES, s);
}

/** Official name for a state code. Throws on an unknown code. */
export function stateNameFor(code: StateCode): string {
  const info = STATE_CODES[code];
  if (!info) throw new Error(`Unknown GST state code: ${code}`);
  return info.name;
}
