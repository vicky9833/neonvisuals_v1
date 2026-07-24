import { describe, it, expect } from "vitest";
import {
  getDefaultRegistration,
  getRegistrationById,
  listRegistrations,
  sellerStateCodeFor,
} from "./registrations";
import { validateGstin } from "./gstin";

describe("GST registrations (seller identity)", () => {
  it("seeds exactly one default registration = mh-primary", () => {
    const def = getDefaultRegistration();
    expect(def.id).toBe("mh-primary");
    expect(listRegistrations().filter((r) => r.isDefault)).toHaveLength(1);
  });

  it("carries the REG-06 certificate values verbatim", () => {
    const r = getRegistrationById("mh-primary")!;
    expect(r.gstin).toBe("27BZSPV5411Q1ZA");
    expect(r.legalName).toBe("VIKAS VISHWAKARMA");
    expect(r.tradeName).toBe("NEON VISUALS");
    expect(r.constitution).toBe("Proprietorship");
    expect(r.stateCode).toBe("27");
    expect(r.stateName).toBe("Maharashtra");
    expect(r.pincode).toBe("400093");
    expect(r.city).toBe("Mumbai");
    expect(r.district).toBe("Mumbai Suburban");
    expect(r.effectiveFrom).toBe("2024-04-06");
    expect(r.msmeUdyamNumber).toBe("UDYAM-MH-18-0340367");
  });

  it("derives PAN from the GSTIN (not hardcoded)", () => {
    const r = getDefaultRegistration();
    expect(r.pan).toBe("BZSPV5411Q");
    expect(validateGstin(r.gstin).ok).toBe(true);
  });

  it("sellerStateCodeFor defaults to the primary and resolves by id", () => {
    expect(sellerStateCodeFor()).toBe("27");
    expect(sellerStateCodeFor("mh-primary")).toBe("27");
  });

  it("throws on an unknown registration id (never guesses a seller state)", () => {
    expect(() => sellerStateCodeFor("does-not-exist")).toThrow();
    expect(getRegistrationById("nope")).toBeNull();
  });
});
