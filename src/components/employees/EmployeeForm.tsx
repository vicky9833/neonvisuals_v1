"use client";

import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import {
  DIETARY_PREFERENCES,
  TSHIRT_SIZES,
  type Employee,
  type EmployeeFormData,
} from "@/types/employee";

type FormState = Record<keyof EmployeeFormData, string>;

const EMPTY: FormState = {
  name: "",
  email: "",
  employee_code: "",
  phone: "",
  department: "",
  designation: "",
  date_of_birth: "",
  joining_date: "",
  manager_name: "",
  manager_email: "",
  tshirt_size: "",
  dietary_preference: "",
  hobbies: "",
  interests: "",
  delivery_address: "",
  city: "Bangalore",
  pincode: "",
};

function fromEmployee(e: Employee): FormState {
  return {
    name: e.name ?? "",
    email: e.email ?? "",
    employee_code: e.employee_code ?? "",
    phone: e.phone ?? "",
    department: e.department ?? "",
    designation: e.designation ?? "",
    date_of_birth: e.date_of_birth ?? "",
    joining_date: e.joining_date ?? "",
    manager_name: e.manager_name ?? "",
    manager_email: e.manager_email ?? "",
    tshirt_size: e.tshirt_size ?? "",
    dietary_preference: e.dietary_preference ?? "",
    hobbies: e.hobbies ?? "",
    interests: e.interests ?? "",
    delivery_address: e.delivery_address ?? "",
    city: e.city ?? "Bangalore",
    pincode: e.pincode ?? "",
  };
}

export function EmployeeForm({
  open,
  onOpenChange,
  mode,
  employee,
  departments,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  employee?: Employee;
  departments: string[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    employee ? fromEmployee(employee) : EMPTY,
  );
  const [showPersonalisation, setShowPersonalisation] = useState(true);
  const [showAddress, setShowAddress] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSaving(true);
    const url =
      mode === "edit" && employee
        ? `/api/employees/${employee.id}`
        : "/api/employees";
    const method = mode === "edit" ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.message ?? "Could not save employee.");
      return;
    }
    toast.success(
      mode === "edit"
        ? "Employee updated successfully"
        : "Employee added successfully",
    );
    onOpenChange(false);
    if (mode === "create") setForm(EMPTY);
    onSaved();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-[#EDE9E3]">
          <SheetTitle className="font-heading text-xl text-navy">
            {mode === "edit" ? "Edit Employee" : "Add Employee"}
          </SheetTitle>
          <SheetDescription>
            We only collect what helps personalise gifting — no sensitive HR
            data.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-6 p-4">
            <Section title="Basic Information">
              <Field label="Full Name" required>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  required
                />
              </Field>
              <Field label="Work Email" required>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Employee Code">
                  <Input
                    value={form.employee_code}
                    onChange={(e) => set("employee_code", e.target.value)}
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </Field>
              </div>
            </Section>

            <Section title="Role & Team">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Department">
                  <Input
                    list="dept-options"
                    value={form.department}
                    onChange={(e) => set("department", e.target.value)}
                  />
                  <datalist id="dept-options">
                    {departments.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Designation">
                  <Input
                    value={form.designation}
                    onChange={(e) => set("designation", e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Manager Name">
                  <Input
                    value={form.manager_name}
                    onChange={(e) => set("manager_name", e.target.value)}
                  />
                </Field>
                <Field label="Manager Email">
                  <Input
                    type="email"
                    value={form.manager_email}
                    onChange={(e) => set("manager_email", e.target.value)}
                  />
                </Field>
              </div>
            </Section>

            <Section title="Important Dates">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date of Birth">
                  <Input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => set("date_of_birth", e.target.value)}
                  />
                </Field>
                <Field label="Joining Date" hint="Used for anniversary tracking">
                  <Input
                    type="date"
                    value={form.joining_date}
                    onChange={(e) => set("joining_date", e.target.value)}
                  />
                </Field>
              </div>
            </Section>

            <CollapsibleSection
              title="Personalisation Details"
              open={showPersonalisation}
              onToggle={() => setShowPersonalisation((v) => !v)}
            >
              <Field label="T-Shirt Size">
                <Select
                  value={form.tshirt_size || undefined}
                  onValueChange={(v) => set("tshirt_size", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {TSHIRT_SIZES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Dietary Preference">
                <RadioGroup
                  value={form.dietary_preference}
                  onValueChange={(v) => set("dietary_preference", v)}
                  className="grid-cols-2"
                >
                  {DIETARY_PREFERENCES.map((d) => (
                    <label
                      key={d.value}
                      className="flex items-center gap-2 text-sm text-[#333333]"
                    >
                      <RadioGroupItem value={d.value} />
                      {d.label}
                    </label>
                  ))}
                </RadioGroup>
              </Field>
              <Field
                label="Hobbies & Interests"
                hint="e.g. photography, running, cooking"
              >
                <Textarea
                  value={form.hobbies}
                  onChange={(e) => set("hobbies", e.target.value)}
                  rows={2}
                />
              </Field>
              <Field label="Notes" hint="Internal only — not visible to the employee">
                <Textarea
                  value={form.interests}
                  onChange={(e) => set("interests", e.target.value)}
                  rows={2}
                />
              </Field>
            </CollapsibleSection>

            <CollapsibleSection
              title="Delivery Address"
              open={showAddress}
              onToggle={() => setShowAddress((v) => !v)}
            >
              <Field label="Address">
                <Textarea
                  value={form.delivery_address}
                  onChange={(e) => set("delivery_address", e.target.value)}
                  rows={2}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City">
                  <Input
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                  />
                </Field>
                <Field label="Pincode">
                  <Input
                    value={form.pincode}
                    onChange={(e) => set("pincode", e.target.value)}
                  />
                </Field>
              </div>
            </CollapsibleSection>

            {error ? (
              <p className="text-sm font-medium text-destructive">{error}</p>
            ) : null}
          </div>

          <SheetFooter className="border-t border-[#EDE9E3]">
            <Button
              type="submit"
              disabled={saving}
              className="bg-navy text-white hover:bg-navy/90"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : mode === "edit" ? (
                "Save Changes"
              ) : (
                "Add Employee"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]"
      >
        {title}
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? <div className="space-y-3">{children}</div> : null}
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-[#9CA3AF]">{hint}</p> : null}
    </div>
  );
}
