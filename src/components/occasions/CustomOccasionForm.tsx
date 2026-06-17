"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CUSTOM_OCCASION_TYPES } from "@/types/occasion";
import type { Employee } from "@/types/employee";

const REMINDER_OPTIONS = [
  { days: 7, label: "7 days before" },
  { days: 3, label: "3 days before" },
  { days: 1, label: "1 day before" },
  { days: 0, label: "On the day" },
];

export function CustomOccasionForm({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("custom");
  const [recurrence, setRecurrence] = useState("none");
  const [description, setDescription] = useState("");
  const [wholeCompany, setWholeCompany] = useState(true);
  const [reminders, setReminders] = useState<number[]>([7, 3, 1, 0]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || wholeCompany || employees.length > 0) return;
    fetch("/api/employees?pageSize=1000&isActive=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.data?.employees) setEmployees(body.data.employees);
      })
      .catch(() => {});
  }, [open, wholeCompany, employees.length]);

  function toggleReminder(days: number) {
    setReminders((prev) =>
      prev.includes(days) ? prev.filter((d) => d !== days) : [...prev, days],
    );
  }
  function toggleEmployee(id: string) {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !date) {
      setError("Title and date are required.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/occasions/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        occasion_date: date,
        occasion_type: type,
        recurrence,
        description: description.trim() || undefined,
        reminder_days_before: reminders,
        employee_ids: wholeCompany ? undefined : selectedEmployees,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.message ?? "Could not save occasion.");
      return;
    }
    toast.success("Occasion added to your calendar");
    // Reset.
    setTitle("");
    setDate("");
    setType("custom");
    setRecurrence("none");
    setDescription("");
    setWholeCompany(true);
    setSelectedEmployees([]);
    setReminders([7, 3, 1, 0]);
    onOpenChange(false);
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
            Add Custom Occasion
          </SheetTitle>
          <SheetDescription>
            Company events, offsites, foundation days and more.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-4 p-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Q2 Team Offsite"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOM_OCCASION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Recurrence</Label>
              <RadioGroup
                value={recurrence}
                onValueChange={setRecurrence}
                className="grid-cols-2"
              >
                {[
                  { v: "none", l: "One-time" },
                  { v: "yearly", l: "Yearly" },
                  { v: "quarterly", l: "Quarterly" },
                  { v: "monthly", l: "Monthly" },
                ].map((r) => (
                  <label
                    key={r.v}
                    className="flex items-center gap-2 text-sm text-[#333333]"
                  >
                    <RadioGroupItem value={r.v} />
                    {r.l}
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-navy">
                <Checkbox
                  checked={wholeCompany}
                  onCheckedChange={(v) => setWholeCompany(v === true)}
                />
                Whole company
              </label>
              {!wholeCompany ? (
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[#EDE9E3] p-2">
                  {employees.length === 0 ? (
                    <p className="px-1 py-2 text-xs text-[#9CA3AF]">
                      No employees found. Add team members first.
                    </p>
                  ) : (
                    employees.map((emp) => (
                      <label
                        key={emp.id}
                        className="flex items-center gap-2 rounded px-1 py-1 text-sm text-[#333333] hover:bg-secondary"
                      >
                        <Checkbox
                          checked={selectedEmployees.includes(emp.id)}
                          onCheckedChange={() => toggleEmployee(emp.id)}
                        />
                        {emp.name}
                      </label>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Reminder schedule</Label>
              <div className="grid grid-cols-2 gap-2">
                {REMINDER_OPTIONS.map((o) => (
                  <label
                    key={o.days}
                    className="flex items-center gap-2 text-sm text-[#333333]"
                  >
                    <Checkbox
                      checked={reminders.includes(o.days)}
                      onCheckedChange={() => toggleReminder(o.days)}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>

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
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Save Occasion"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
