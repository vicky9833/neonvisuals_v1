import Papa from "papaparse";
import type {
  CSVRow,
  CSVValidationResult,
  EmployeeFormData,
} from "@/types/employee";

/**
 * Client-side CSV/Excel parsing + validation. Runs entirely in the browser —
 * no employee data is sent to the server until the user confirms import.
 */

const TEMPLATE_HEADERS = [
  "name",
  "email",
  "employee_code",
  "phone",
  "department",
  "designation",
  "date_of_birth",
  "joining_date",
  "manager_name",
  "tshirt_size",
  "dietary_preference",
];

const VALID_TSHIRT = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const VALID_DIET = ["vegetarian", "non_vegetarian", "vegan", "no_preference"];

/** Maps a raw header to a canonical CSVRow key (handles common variants). */
function normalizeHeader(raw: string): string {
  const h = raw.trim().toLowerCase().replace(/[\s.]+/g, "_");
  const aliases: Record<string, string> = {
    full_name: "name",
    employee_name: "name",
    name: "name",
    email_address: "email",
    work_email: "email",
    email: "email",
    emp_code: "employee_code",
    employee_id: "employee_code",
    emp_id: "employee_code",
    employee_code: "employee_code",
    mobile: "phone",
    mobile_number: "phone",
    phone_number: "phone",
    contact: "phone",
    phone: "phone",
    dept: "department",
    department: "department",
    role: "designation",
    title: "designation",
    job_title: "designation",
    designation: "designation",
    dob: "date_of_birth",
    birthday: "date_of_birth",
    birth_date: "date_of_birth",
    date_of_birth: "date_of_birth",
    doj: "joining_date",
    date_of_joining: "joining_date",
    joining_date: "joining_date",
    start_date: "joining_date",
    manager: "manager_name",
    manager_name: "manager_name",
    reporting_manager: "manager_name",
    manager_email: "manager_email",
    tshirt: "tshirt_size",
    tshirt_size: "tshirt_size",
    t_shirt_size: "tshirt_size",
    shirt_size: "tshirt_size",
    size: "tshirt_size",
    diet: "dietary_preference",
    dietary: "dietary_preference",
    dietary_preference: "dietary_preference",
    food_preference: "dietary_preference",
  };
  return aliases[h] ?? h;
}

function rowsFromRecords(records: Record<string, unknown>[]): CSVRow[] {
  return records.map((rec) => {
    const out: CSVRow = { name: "", email: "" };
    for (const [key, value] of Object.entries(rec)) {
      const canonical = normalizeHeader(key);
      const str = value == null ? "" : String(value).trim();
      out[canonical] = str;
    }
    return out;
  });
}

export function parseCSV(file: File): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h,
      complete: (results) => resolve(rowsFromRecords(results.data)),
      error: (err) => reject(err),
    });
  });
}

async function parseExcel(file: File): Promise<CSVRow[]> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  return rowsFromRecords(records);
}

/** Detects the file type by extension and parses accordingly. */
export async function parseFile(file: File): Promise<CSVRow[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    return parseExcel(file);
  }
  return parseCSV(file);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Parses DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, MM/DD/YYYY → ISO (DD/MM first). */
export function parseFlexibleDate(input: string): {
  iso: string | null;
  valid: boolean;
} {
  const value = input.trim();
  if (!value) return { iso: null, valid: true };

  const isoMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return build(Number(y), Number(m), Number(d));
  }

  const parts = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (parts) {
    const a = Number(parts[1]);
    const b = Number(parts[2]);
    const year = Number(parts[3]);
    // Prefer DD/MM/YYYY (Indian convention). Fall back to MM/DD only when
    // the first component cannot be a day.
    if (a > 12 && b <= 12) return build(year, b, a);
    if (b > 12 && a <= 12) return build(year, a, b);
    return build(year, b, a); // ambiguous → DD/MM
  }

  return { iso: null, valid: false };
}

function build(
  year: number,
  month: number,
  day: number,
): { iso: string | null; valid: boolean } {
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return { iso: null, valid: false };
  }
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { iso, valid: true };
}

function normalizeDietary(value: string): string | null {
  const v = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const map: Record<string, string> = {
    veg: "vegetarian",
    vegetarian: "vegetarian",
    non_veg: "non_vegetarian",
    nonveg: "non_vegetarian",
    non_vegetarian: "non_vegetarian",
    vegan: "vegan",
    none: "no_preference",
    no_preference: "no_preference",
  };
  return map[v] ?? null;
}

export function validateCSVRows(rows: CSVRow[]): CSVValidationResult[] {
  const emailCounts = new Map<string, number>();
  for (const r of rows) {
    const e = (r.email ?? "").trim().toLowerCase();
    if (e) emailCounts.set(e, (emailCounts.get(e) ?? 0) + 1);
  }

  return rows.map((row, i) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const data: CSVRow = { ...row };

    const name = (row.name ?? "").trim();
    const email = (row.email ?? "").trim().toLowerCase();

    if (!name) errors.push("Name is required");
    if (!email) {
      errors.push("Email is required");
    } else if (!EMAIL_RE.test(email)) {
      errors.push("Email format is invalid");
    } else if ((emailCounts.get(email) ?? 0) > 1) {
      errors.push("Duplicate email within this file");
    }
    data.email = email;
    data.name = name;

    // Dates.
    if (row.date_of_birth) {
      const { iso, valid } = parseFlexibleDate(row.date_of_birth);
      if (!valid) {
        errors.push("Date of birth is not a valid date");
      } else if (iso) {
        data.date_of_birth = iso;
        const age =
          (Date.now() - new Date(iso).getTime()) / (365.25 * 86_400_000);
        if (age < 16 || age > 80) {
          warnings.push("Date of birth looks unusual (age < 16 or > 80)");
        }
      }
    }
    if (row.joining_date) {
      const { iso, valid } = parseFlexibleDate(row.joining_date);
      if (!valid) {
        errors.push("Joining date is not a valid date");
      } else if (iso) {
        data.joining_date = iso;
        if (new Date(iso).getTime() > Date.now()) {
          warnings.push("Joining date is in the future");
        }
      }
    }

    // Enums.
    if (row.tshirt_size) {
      const size = row.tshirt_size.trim().toUpperCase();
      if (!VALID_TSHIRT.includes(size)) {
        errors.push(`T-shirt size "${row.tshirt_size}" is invalid`);
      } else {
        data.tshirt_size = size;
      }
    }
    if (row.dietary_preference) {
      const diet = normalizeDietary(row.dietary_preference);
      if (!diet) {
        errors.push(`Dietary preference "${row.dietary_preference}" is invalid`);
      } else {
        data.dietary_preference = diet;
      }
    }

    // Warnings.
    if (row.phone) {
      const digits = row.phone.replace(/\D/g, "");
      if (digits.length < 10) warnings.push("Phone number looks invalid");
    }
    if (!row.department) warnings.push("Department is empty");
    if (!row.designation) warnings.push("Designation is empty");

    return {
      row: i + 1,
      data,
      errors,
      warnings,
      isValid: errors.length === 0,
    };
  });
}

/** Converts a validated CSV row into the API form-data shape. */
export function rowToFormData(row: CSVRow): EmployeeFormData {
  return {
    name: row.name,
    email: row.email,
    employee_code: row.employee_code,
    phone: row.phone,
    department: row.department,
    designation: row.designation,
    date_of_birth: row.date_of_birth,
    joining_date: row.joining_date,
    manager_name: row.manager_name,
    manager_email: row.manager_email,
    tshirt_size: row.tshirt_size,
    dietary_preference: row.dietary_preference,
  };
}

export function generateCSVTemplate(): string {
  const example1 = [
    "Priya Sharma",
    "priya@company.com",
    "EMP001",
    "9876543210",
    "Engineering",
    "Software Engineer",
    "15/08/1995",
    "01/04/2023",
    "Vikas V",
    "M",
    "vegetarian",
  ];
  const example2 = [
    "Rahul Kumar",
    "rahul@company.com",
    "EMP002",
    "9876543211",
    "Design",
    "Product Designer",
    "22/03/1993",
    "15/07/2022",
    "Priya Sharma",
    "L",
    "non_vegetarian",
  ];
  return Papa.unparse({
    fields: TEMPLATE_HEADERS,
    data: [example1, example2],
  });
}

export function downloadCSVTemplate(): void {
  const csv = generateCSVTemplate();
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "neon-visuals-employee-template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Builds a downloadable error report from failed bulk rows. */
export function downloadErrorReport(
  errors: Array<{ row: number; error: string }>,
): void {
  const csv = Papa.unparse({
    fields: ["row", "error"],
    data: errors.map((e) => [e.row, e.error]),
  });
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "neon-visuals-import-errors.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
