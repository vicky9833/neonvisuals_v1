import { describe, it, expect } from "vitest";
import { STATE_CODES, isValidStateCode, stateNameFor } from "./state-codes";

describe("GST state codes", () => {
  it("has 40 entries (01–38 + 97 + 99)", () => {
    expect(Object.keys(STATE_CODES)).toHaveLength(40);
  });

  it("contains every code 01–38 plus 97 and 99", () => {
    for (let n = 1; n <= 38; n += 1) {
      const code = String(n).padStart(2, "0");
      expect(isValidStateCode(code)).toBe(true);
    }
    expect(isValidStateCode("97")).toBe(true);
    expect(isValidStateCode("99")).toBe(true);
  });

  it("maps the key SoT codes correctly", () => {
    expect(stateNameFor("27")).toBe("Maharashtra");
    expect(stateNameFor("29")).toBe("Karnataka");
    expect(stateNameFor("07")).toBe("Delhi");
    expect(stateNameFor("37")).toBe("Andhra Pradesh"); // active AP
    expect(stateNameFor("36")).toBe("Telangana");
    expect(stateNameFor("38")).toBe("Ladakh");
  });

  it("flags the historical/legacy codes", () => {
    expect(STATE_CODES["25"].legacy).toBe(true); // Daman & Diu (pre-2020 merger)
    expect(STATE_CODES["28"].legacy).toBe(true); // Andhra Pradesh (pre-Telangana)
    expect(STATE_CODES["26"].name).toBe("Dadra and Nagar Haveli and Daman and Diu");
  });

  it("rejects unknown codes", () => {
    expect(isValidStateCode("00")).toBe(false);
    expect(isValidStateCode("39")).toBe(false);
    expect(isValidStateCode("7")).toBe(false);
    expect(isValidStateCode("KA")).toBe(false);
  });

  it("is frozen", () => {
    expect(Object.isFrozen(STATE_CODES)).toBe(true);
  });
});
