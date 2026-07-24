/**
 * GST computation types. ALL MONEY IS INTEGER PAISE. No floats, no rupees.
 */
import type { StateCode } from "./state-codes";

export type SupplyType = "INTRA_STATE" | "INTER_STATE";

/** Allowed GST rate slabs (percent). */
export const ALLOWED_GST_RATES = [0, 0.25, 3, 5, 12, 18, 28] as const;
export type GstRatePercent = (typeof ALLOWED_GST_RATES)[number];

export interface GstLineInput {
  lineId: string;
  description: string;
  hsnOrSac: string;
  isService: boolean;
  quantity: number;
  /** Pre-tax price per unit, in integer paise. */
  unitPricePaise: number;
  /** Absolute discount applied to the line, in integer paise. */
  discountPaise?: number;
  /** One of ALLOWED_GST_RATES. */
  gstRatePercent: number;
}

export interface GstLineResult extends GstLineInput {
  taxableValuePaise: number;
  cgstRatePercent: number;
  cgstPaise: number;
  sgstRatePercent: number;
  sgstPaise: number;
  igstRatePercent: number;
  igstPaise: number;
  totalTaxPaise: number;
  lineTotalPaise: number;
}

export interface HsnSummaryRow {
  hsnOrSac: string;
  gstRatePercent: number;
  taxableValuePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalTaxPaise: number;
}

export interface RateSummaryRow {
  gstRatePercent: number;
  taxableValuePaise: number;
  totalTaxPaise: number;
}

export interface GstComputation {
  supplyType: SupplyType;
  sellerStateCode: StateCode;
  placeOfSupplyStateCode: StateCode;
  lines: GstLineResult[];
  totalTaxableValuePaise: number;
  totalCgstPaise: number;
  totalSgstPaise: number;
  totalIgstPaise: number;
  totalTaxPaise: number;
  grandTotalBeforeRoundingPaise: number;
  /** Signed, range [-49, +50] (Section 170 CGST Act 2017: ties round up). */
  roundOffPaise: number;
  /** Multiple of 100. */
  grandTotalPaise: number;
  hsnSummary: HsnSummaryRow[];
  rateSummary: RateSummaryRow[];
}

/** Typed error for all GST validation failures (never silently coerce). */
export class GstValidationError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "GstValidationError";
    this.code = code;
  }
}
