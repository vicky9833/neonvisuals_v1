import { describe, it, expect } from "vitest";
import { cityToStateCode, knownCityAliases } from "./city-state";
import { STATE_CODES, type StateCode } from "./state-codes";

// Every alias -> expected state code. This table is the single source of truth for the test and
// mirrors the spec's required coverage.
const EXPECTED: ReadonlyArray<readonly [string, StateCode]> = [
  ["Bengaluru", "29"], ["Bangalore", "29"], ["Mysore", "29"], ["Mysuru", "29"],
  ["Mangalore", "29"], ["Mangaluru", "29"], ["Hubli", "29"], ["Belgaum", "29"],
  ["Belagavi", "29"], ["Karnataka", "29"],
  ["Mumbai", "27"], ["Bombay", "27"], ["Navi Mumbai", "27"], ["Thane", "27"],
  ["Pune", "27"], ["Nagpur", "27"], ["Nashik", "27"], ["Aurangabad", "27"], ["Maharashtra", "27"],
  ["Delhi", "07"], ["New Delhi", "07"],
  ["Gurgaon", "06"], ["Gurugram", "06"], ["Faridabad", "06"], ["Haryana", "06"],
  ["Noida", "09"], ["Greater Noida", "09"], ["Ghaziabad", "09"], ["Lucknow", "09"],
  ["Kanpur", "09"], ["Uttar Pradesh", "09"],
  ["Hyderabad", "36"], ["Secunderabad", "36"], ["Telangana", "36"],
  ["Chennai", "33"], ["Madras", "33"], ["Coimbatore", "33"], ["Madurai", "33"], ["Tamil Nadu", "33"],
  ["Kolkata", "19"], ["Calcutta", "19"], ["West Bengal", "19"],
  ["Ahmedabad", "24"], ["Surat", "24"], ["Vadodara", "24"], ["Baroda", "24"],
  ["Rajkot", "24"], ["Gandhinagar", "24"], ["Gujarat", "24"],
  ["Jaipur", "08"], ["Rajasthan", "08"],
  ["Chandigarh", "04"],
  ["Kochi", "32"], ["Cochin", "32"], ["Ernakulam", "32"], ["Thiruvananthapuram", "32"],
  ["Trivandrum", "32"], ["Kerala", "32"],
  ["Indore", "23"], ["Bhopal", "23"], ["Madhya Pradesh", "23"],
  ["Bhubaneswar", "21"], ["Odisha", "21"], ["Orissa", "21"],
  ["Patna", "10"], ["Bihar", "10"],
  ["Guwahati", "18"], ["Assam", "18"],
  ["Goa", "30"], ["Panaji", "30"], ["Panjim", "30"],
  ["Dehradun", "05"], ["Uttarakhand", "05"],
  ["Raipur", "22"], ["Chhattisgarh", "22"],
  ["Ranchi", "20"], ["Jharkhand", "20"],
  ["Amritsar", "03"], ["Ludhiana", "03"], ["Punjab", "03"],
  ["Visakhapatnam", "37"], ["Vizag", "37"], ["Vijayawada", "37"], ["Andhra Pradesh", "37"],
];

describe("cityToStateCode - every mapping", () => {
  for (const [input, code] of EXPECTED) {
    it(`${input} -> ${code}`, () => {
      expect(cityToStateCode(input)).toBe(code);
    });
  }
});

describe("cityToStateCode - case and whitespace insensitivity", () => {
  it("handles upper/lower/mixed case", () => {
    expect(cityToStateCode("BENGALURU")).toBe("29");
    expect(cityToStateCode("mumbai")).toBe("27");
    expect(cityToStateCode("HyDeRaBaD")).toBe("36");
  });
  it("handles leading/trailing/inner whitespace", () => {
    expect(cityToStateCode("   Pune   ")).toBe("27");
    expect(cityToStateCode("new    delhi")).toBe("07");
    expect(cityToStateCode("\tKolkata\n")).toBe("19");
  });
});

describe("cityToStateCode - compound inputs (comma / hyphen / pincode)", () => {
  it("'Bangalore, Karnataka' -> 29", () => {
    expect(cityToStateCode("Bangalore, Karnataka")).toBe("29");
  });
  it("'Mumbai - 400093' -> 27 (pincode token ignored)", () => {
    expect(cityToStateCode("Mumbai - 400093")).toBe("27");
  });
  it("'Andheri East, Mumbai, Maharashtra 400093' -> 27", () => {
    expect(cityToStateCode("Andheri East, Mumbai, Maharashtra 400093")).toBe("27");
  });
  it("'New Delhi 110001' -> 07 (multi-word phrase wins)", () => {
    expect(cityToStateCode("New Delhi 110001")).toBe("07");
  });
  it("'Navi Mumbai' -> 27", () => {
    expect(cityToStateCode("Navi Mumbai")).toBe("27");
  });
});

describe("cityToStateCode - null / empty / garbage -> null (never guesses)", () => {
  it("null and undefined", () => {
    expect(cityToStateCode(null)).toBeNull();
    expect(cityToStateCode(undefined)).toBeNull();
  });
  it("empty and whitespace-only", () => {
    expect(cityToStateCode("")).toBeNull();
    expect(cityToStateCode("     ")).toBeNull();
    expect(cityToStateCode(",-  -,")).toBeNull();
  });
  it("unrecognised places", () => {
    expect(cityToStateCode("Atlantis")).toBeNull();
    expect(cityToStateCode("Gotham City")).toBeNull();
    expect(cityToStateCode("12345")).toBeNull();
    expect(cityToStateCode("xyzzy")).toBeNull();
  });
});

describe("cityToStateCode - integrity", () => {
  it("NO alias maps to a state code absent from state-codes.ts", () => {
    for (const alias of knownCityAliases()) {
      const code = cityToStateCode(alias);
      expect(code, `alias '${alias}' resolved to null`).not.toBeNull();
      expect(code! in STATE_CODES, `code ${code} (from '${alias}') missing from STATE_CODES`).toBe(true);
    }
  });

  it("every EXPECTED code exists in state-codes.ts", () => {
    for (const [, code] of EXPECTED) {
      expect(code in STATE_CODES).toBe(true);
    }
  });
});
