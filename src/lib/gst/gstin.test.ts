import { describe, it, expect } from "vitest";
import {
  normalizeGstin,
  parseGstin,
  isValidGstinFormat,
  isValidGstinChecksum,
  validateGstin,
  stateCodeFromGstin,
  panFromGstin,
} from "./gstin";

const VALID = "27BZSPV5411Q1ZA";
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

describe("GSTIN checksum + parsing", () => {
  it("accepts the real seller GSTIN 27BZSPV5411Q1ZA", () => {
    expect(isValidGstinFormat(VALID)).toBe(true);
    expect(isValidGstinChecksum(VALID)).toBe(true);
    expect(validateGstin(VALID)).toEqual({
      ok: true,
      parsed: { stateCode: "27", pan: "BZSPV5411Q", entityNumber: "1", checkDigit: "A" },
    });
  });

  it("parses parts correctly", () => {
    expect(stateCodeFromGstin(VALID)).toBe("27");
    expect(panFromGstin(VALID)).toBe("BZSPV5411Q");
    expect(parseGstin(VALID)?.checkDigit).toBe("A");
  });

  it("normalizes lowercase + whitespace and still validates", () => {
    expect(normalizeGstin("  27bzspv5411q1za ")).toBe(VALID);
    expect(isValidGstinChecksum(" 27bzspv5411q1za ")).toBe(true);
    expect(validateGstin("27bzspv5411q1za").ok).toBe(true);
  });

  it("rejects EVERY single-character mutation, split into checksum vs format buckets", () => {
    // Every one of the 15 * 35 = 525 single-character mutations of a valid GSTIN must be rejected.
    // We separate them by WHY they are invalid, determined at runtime:
    //   - shape-preserving mutation (still matches the structural regex) → must fail the CHECKSUM.
    //   - shape-breaking mutation (breaks the regex, e.g. a letter where a digit belongs) → must
    //     fail the FORMAT check.
    let checksumBucket = 0;
    let formatBucket = 0;
    for (let pos = 0; pos < VALID.length; pos += 1) {
      for (const ch of ALPHABET) {
        if (ch === VALID[pos]) continue;
        const mutated = VALID.slice(0, pos) + ch + VALID.slice(pos + 1);
        if (isValidGstinFormat(mutated)) {
          // Structure intact → the ONLY thing that can reject it is the checksum.
          expect(isValidGstinChecksum(mutated), `${mutated} must fail checksum`).toBe(false);
          checksumBucket += 1;
        } else {
          // Structure broken → the format gate must reject it.
          expect(isValidGstinFormat(mutated), `${mutated} must fail format`).toBe(false);
          formatBucket += 1;
        }
        // Either way, the full validator rejects it.
        expect(validateGstin(mutated).ok, `mutation ${mutated} must be invalid`).toBe(false);
      }
    }
    expect(checksumBucket).toBe(309);
    expect(formatBucket).toBe(216);
    expect(checksumBucket + formatBucket).toBe(525);
  });

  it("rejects wrong length", () => {
    expect(validateGstin("27BZSPV5411Q1Z")).toEqual({ ok: false, reason: "length_not_15" });
    expect(validateGstin("27BZSPV5411Q1ZAX")).toEqual({ ok: false, reason: "length_not_15" });
    expect(validateGstin("")).toEqual({ ok: false, reason: "length_not_15" });
  });

  it("rejects structurally malformed 15-char strings", () => {
    // 15 chars but letters where digits belong (state code position).
    expect(validateGstin("AABZSPV5411Q1ZA").ok).toBe(false);
  });

  it("rejects a valid-format/valid-checksum-shaped string with an unknown state code path", () => {
    // "99" is a valid state code; ensure the checksum gate still governs.
    const bad = "99BZSPV5411Q1ZA"; // wrong checksum for this prefix
    expect(validateGstin(bad).ok).toBe(false);
  });
});
