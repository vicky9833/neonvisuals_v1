/**
 * OUR OWN GST registrations — the single source of truth for the seller identity.
 *
 * NO seller state code / GSTIN may appear as a literal anywhere else in the codebase;
 * everything reads from here. Adding a second registration is a pure data addition to
 * REGISTRATIONS (the resolver + assertions handle the rest).
 *
 * Values are verbatim from the GST REG-06 certificate. Pure module.
 */
import { validateGstin, panFromGstin } from "./gstin";
import { isValidStateCode, type StateCode } from "./state-codes";

export interface GstRegistration {
  id: string;
  gstin: string;
  legalName: string;
  tradeName: string;
  constitution: string;
  registrationType: string;
  addressLines: string[];
  city: string;
  district: string;
  stateCode: StateCode;
  stateName: string;
  pincode: string;
  effectiveFrom: string; // ISO date
  isDefault: boolean;
  msmeUdyamNumber?: string;
  /** Derived from the GSTIN at module init — never hardcoded. */
  pan: string;
}

const MH_PRIMARY_GSTIN = "27BZSPV5411Q1ZA";

/**
 * Registrations, ordered. A second registration is a pure push to this array with
 * `isDefault: false`. Exactly one entry may have `isDefault: true` (asserted below).
 */
export const REGISTRATIONS: readonly GstRegistration[] = Object.freeze([
  {
    id: "mh-primary",
    gstin: MH_PRIMARY_GSTIN,
    legalName: "VIKAS VISHWAKARMA",
    tradeName: "NEON VISUALS",
    constitution: "Proprietorship",
    registrationType: "Regular",
    addressLines: [
      "Room No 20",
      "Vishwakarma Rahiwashi Sangh",
      "Jogeshwari Vikhroli Link Road",
      "Near SEEPZ Quarters",
      "Andheri East",
    ],
    city: "Mumbai",
    district: "Mumbai Suburban",
    stateCode: "27",
    stateName: "Maharashtra",
    pincode: "400093", // GST certificate value (NOT the MSME cert's 400018).
    effectiveFrom: "2024-04-06",
    isDefault: true,
    msmeUdyamNumber: "UDYAM-MH-18-0340367",
    // Derived from the GSTIN (characters 3–12), not hardcoded.
    pan: panFromGstin(MH_PRIMARY_GSTIN)!,
  },
]);

// ---------------------------------------------------------------------------
// Module-load integrity assertions — fail fast on a bad registration.
// ---------------------------------------------------------------------------
(function assertRegistrationsValid() {
  const defaults = REGISTRATIONS.filter((r) => r.isDefault);
  if (defaults.length !== 1) {
    throw new Error(`GST registrations must have exactly one default; found ${defaults.length}.`);
  }
  const ids = new Set<string>();
  for (const reg of REGISTRATIONS) {
    if (ids.has(reg.id)) throw new Error(`Duplicate GST registration id: ${reg.id}`);
    ids.add(reg.id);

    const v = validateGstin(reg.gstin);
    if (!v.ok) {
      throw new Error(`GST registration '${reg.id}' has an invalid GSTIN (${v.reason}).`);
    }
    if (!isValidStateCode(reg.stateCode)) {
      throw new Error(`GST registration '${reg.id}' has an invalid state code: ${reg.stateCode}.`);
    }
    if (v.parsed.stateCode !== reg.stateCode) {
      throw new Error(
        `GST registration '${reg.id}' stateCode ${reg.stateCode} does not match its GSTIN prefix ${v.parsed.stateCode}.`,
      );
    }
    if (reg.pan !== v.parsed.pan) {
      throw new Error(`GST registration '${reg.id}' PAN does not match its GSTIN.`);
    }
  }
})();

/** The default (primary) registration. */
export function getDefaultRegistration(): GstRegistration {
  return REGISTRATIONS.find((r) => r.isDefault)!;
}

/**
 * Single-line full supplier address for a GST tax invoice (Rule 46 CGST Rules: building, street,
 * locality, city, state, PIN). Built from the registration's addressLines + city + stateName +
 * pincode + "India". Never hardcoded at a call site.
 */
export function formatRegisteredAddress(reg: GstRegistration): string {
  return [
    reg.addressLines.join(", "),
    reg.city,
    `${reg.stateName} ${reg.pincode}`,
    "India",
  ].join(", ");
}

/** Registration by id, or null. */
export function getRegistrationById(id: string): GstRegistration | null {
  return REGISTRATIONS.find((r) => r.id === id) ?? null;
}

/** All registrations (readonly copy). */
export function listRegistrations(): readonly GstRegistration[] {
  return REGISTRATIONS;
}

/**
 * Seller state code for a registration id (defaults to the primary). Throws if an
 * explicit id is supplied but unknown — the caller must not guess a seller state.
 */
export function sellerStateCodeFor(registrationId?: string): StateCode {
  if (registrationId == null) return getDefaultRegistration().stateCode;
  const reg = getRegistrationById(registrationId);
  if (!reg) throw new Error(`Unknown GST registration id: ${registrationId}`);
  return reg.stateCode;
}
