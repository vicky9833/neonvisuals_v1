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
  department?: string | null;
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
  department?: string;
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

export interface CSVValidationResult {
  row: number;
  data: CSVRow;
  errors: string[];
  warnings: string[];
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
