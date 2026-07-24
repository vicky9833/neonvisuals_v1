import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { STATE_CODES } from "@/lib/gst";

// Source-scan (same technique as billing-gst.test.ts test #8): the place-of-supply label on the
// tax-invoice PDF must be DERIVED from the invoice via stateNameFor(), never a hardcoded state
// name. This is the defect that printed "Karnataka" on a Maharashtra seller's invoice.
const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "invoice-pdf.tsx"), "utf8");

describe("invoice-pdf.tsx: place-of-supply label is derived, no state-name literal", () => {
  it("contains no GST state-name literal (every name is resolved via stateNameFor)", () => {
    for (const info of Object.values(STATE_CODES)) {
      expect(
        src.includes(info.name),
        `state name "${info.name}" must not appear as a literal in invoice-pdf.tsx`,
      ).toBe(false);
    }
  });

  it("the old hardcoded 'Karnataka (Intra-state)' literal is gone (and no 'Maharashtra' literal)", () => {
    expect(src.includes("Karnataka")).toBe(false);
    expect(src.includes("Maharashtra")).toBe(false);
  });
});
