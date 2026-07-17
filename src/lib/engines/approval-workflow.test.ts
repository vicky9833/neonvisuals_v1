import { describe, it, expect } from "vitest";
import {
  selectNextApproverRole,
  computeQuoteAmount,
  isOverBudget,
  occasionTypeKeyFromOccasionKey,
} from "./approval-workflow";

describe("selectNextApproverRole (§7 routing, decision 2)", () => {
  it("prefers finance when available", () => {
    expect(selectNextApproverRole({ finance: true, org_admin: true, org_owner: true })).toBe("finance");
  });
  it("falls back to org_admin when no finance member", () => {
    expect(selectNextApproverRole({ finance: false, org_admin: true, org_owner: true })).toBe("org_admin");
  });
  it("falls back to org_owner when no finance or admin", () => {
    expect(selectNextApproverRole({ finance: false, org_admin: false, org_owner: true })).toBe("org_owner");
  });
  it("returns null only when no unlimited approver exists (defensive)", () => {
    expect(selectNextApproverRole({ finance: false, org_admin: false, org_owner: false })).toBeNull();
  });
});

describe("computeQuoteAmount", () => {
  it("prefers final_total over total_amount", () => {
    expect(computeQuoteAmount({ final_total: 80000, total_amount: 50000 })).toBe(80000);
  });
  it("uses total_amount when final_total is null", () => {
    expect(computeQuoteAmount({ final_total: null, total_amount: 30000 })).toBe(30000);
  });
  it("is null when both are absent (indeterminate)", () => {
    expect(computeQuoteAmount({ final_total: null, total_amount: null })).toBeNull();
    expect(computeQuoteAmount({})).toBeNull();
  });
});

describe("isOverBudget (informational, never blocks)", () => {
  it("flags strictly-over amounts", () => {
    expect(isOverBudget(80000, 50000)).toBe(true);
  });
  it("does not flag equal or under", () => {
    expect(isOverBudget(50000, 50000)).toBe(false);
    expect(isOverBudget(30000, 50000)).toBe(false);
  });
  it("does not flag when amount or budget is unknown", () => {
    expect(isOverBudget(null, 50000)).toBe(false);
    expect(isOverBudget(80000, null)).toBe(false);
    expect(isOverBudget(80000, undefined)).toBe(false);
  });
});

describe("occasionTypeKeyFromOccasionKey", () => {
  it("extracts the type from an employee occasion key", () => {
    expect(occasionTypeKeyFromOccasionKey("comp1:emp1:birthday:2026-01-01")).toBe("birthday");
  });
  it("extracts the type from a company-wide occasion key", () => {
    expect(occasionTypeKeyFromOccasionKey("comp1:cw:festival:2026-11-01:Diwali")).toBe("festival");
  });
  it("returns null for null/short keys", () => {
    expect(occasionTypeKeyFromOccasionKey(null)).toBeNull();
    expect(occasionTypeKeyFromOccasionKey("comp1:emp1")).toBeNull();
  });
});
