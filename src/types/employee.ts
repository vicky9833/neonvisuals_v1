export type TshirtSize = "XS" | "S" | "M" | "L" | "XL" | "XXL" | "3XL";
export type DietaryPreference =
  | "vegetarian"
  | "non_vegetarian"
  | "vegan"
  | "no_preference";

export interface Employee {
  id: string;
  company_id: string;
  name: string;
  email: string;
  employee_code?: string | null;
  phone?: string | null;
  /** Human-readable department name, resolved via the department_id FK (read-only). */
  department?: string | null;
  /** FK to departments (the canonical department reference since Prompt 4a). */
  department_id?: string | null;
  designation?: string | null;
  /** Day/month of birth only — the birth YEAR is never stored (privacy, migration 018). */
  dob_day?: number | null;
  dob_month?: number | null;
  /** @deprecated Write-only shim: the form may submit a full ISO date; the data
   *  layer discards the year and persists dob_day/dob_month. Never populated on read. */
  date_of_birth?: string | null;
  joining_date?: string | null; // ISO date
  manager_name?: string | null;
  manager_email?: string | null;
  tshirt_size?: TshirtSize | null;
  dietary_preference?: DietaryPreference | null;
  hobbies?: string | null;
  interests?: string | null;
  delivery_address?: string | null;
  city?: string | null;
  pincode?: string | null;
  is_active: boolean;
  notes?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface EmployeeFormData {
  name: string;
  email: string;
  employee_code?: string;
  phone?: string;
  /** Free-text department name (legacy form field; NOT persisted — Prompt 5 departments CRUD). */
  department?: string;
  /** Canonical department FK; persisted when supplied. */
  department_id?: string;
  designation?: string;
  /** Full ISO date accepted from the single-employee form; year discarded on write. */
  date_of_birth?: string;
  /** Preferred birthday inputs (no year). */
  dob_day?: number;
  dob_month?: number;
  joining_date?: string;
  manager_name?: string;
  manager_email?: string;
  tshirt_size?: string;
  dietary_preference?: string;
  hobbies?: string;
  interests?: string;
  delivery_address?: string;
  city?: string;
  pincode?: string;
}

export interface CSVRow {
  name: string;
  email: string;
  employee_code?: string;
  phone?: string;
  department?: string;
  designation?: string;
  date_of_birth?: string;
  dob_day?: string;
  dob_month?: string;
  joining_date?: string;
  manager_name?: string;
  manager_email?: string;
  tshirt_size?: string;
  dietary_preference?: string;
  [key: string]: string | undefined;
}

/**
 * BY-REFERENCE import error codes (§10.12-13). Error reports reference row
 * NUMBER + field NAME + this CODE — NEVER the offending value. No PII/value may
 * appear in any error, log, or report.
 */
export type ImportErrorCode =
  | "required_missing"
  | "invalid_email"
  | "duplicate_email"
  | "invalid_date"
  | "future_date"
  | "invalid_enum"
  | "invalid_phone"
  | "empty_field"
  | "row_limit"
  | "bad_header"
  | "parse_failed"
  | "insert_failed";

/** A field-scoped issue with no value (by-reference). */
export interface ImportIssue {
  field: string;
  code: ImportErrorCode;
}

/** A row-scoped error for the downloadable/report payload (no value). */
export interface ImportRowError {
  row: number;
  field: string;
  code: ImportErrorCode;
}

export interface CSVValidationResult {
  row: number;
  data: CSVRow;
  errors: ImportIssue[];
  warnings: ImportIssue[];
  isValid: boolean;
}

export const TSHIRT_SIZES: TshirtSize[] = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "3XL",
];

export const DIETARY_PREFERENCES: {
  value: DietaryPreference;
  label: string;
}[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "non_vegetarian", label: "Non-Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "no_preference", label: "No Preference" },
];
