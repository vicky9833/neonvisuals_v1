"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Calendar, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmployeeAvatar } from "@/components/employees/EmployeeAvatar";
import { EmployeeGiftPanel } from "@/components/gifts/EmployeeGiftPanel";
import { DIETARY_PREFERENCES, type Employee } from "@/types/employee";

function fmtDate(value?: string | null): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "d MMM yyyy");
  } catch {
    return value;
  }
}

function dietLabel(value?: string | null): string {
  return DIETARY_PREFERENCES.find((d) => d.value === value)?.label ?? "—";
}

export function EmployeeDetail({
  open,
  onOpenChange,
  employee,
  onEdit,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onEdit: (employee: Employee) => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  if (!employee) return null;

  async function toggleActive() {
    if (!employee) return;
    setBusy(true);
    const res = await fetch(`/api/employees/${employee.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !employee.is_active }),
    });
    setBusy(false);
    if (res.ok) {
      toast.success(employee.is_active ? "Employee deactivated" : "Employee reactivated");
      onOpenChange(false);
      onChanged();
    } else {
      toast.error("Could not update employee");
    }
  }

  async function remove() {
    if (!employee) return;
    setBusy(true);
    const res = await fetch(`/api/employees/${employee.id}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (res.ok) {
      toast.success("Employee removed");
      onOpenChange(false);
      onChanged();
    } else {
      toast.error("Could not remove employee");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-[#EDE9E3]">
          <div className="flex items-center gap-4">
            <EmployeeAvatar name={employee.name} size="lg" />
            <div className="min-w-0">
              <SheetTitle className="font-heading text-xl text-navy">
                {employee.name}
              </SheetTitle>
              <p className="text-sm text-[#6B7280]">
                {employee.designation ?? "—"}
              </p>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  employee.is_active
                    ? "bg-[#2D6A4F]/10 text-[#2D6A4F]"
                    : "bg-[#9CA3AF]/15 text-[#6B7280]"
                }`}
              >
                {employee.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="profile" className="flex-1 p-4">
          <TabsList className="w-full">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="gifts">Gift History</TabsTrigger>
            <TabsTrigger value="occasions">Occasions</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(employee)}
              >
                <Pencil className="size-3.5" /> Edit
              </Button>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Detail label="Email" value={employee.email} />
              <Detail label="Employee Code" value={employee.employee_code} />
              <Detail label="Phone" value={employee.phone} />
              <Detail label="Department" value={employee.department} />
              <Detail label="Designation" value={employee.designation} />
              <Detail label="Manager" value={employee.manager_name} />
              <Detail label="Date of Birth" value={fmtDate(employee.date_of_birth)} />
              <Detail label="Joining Date" value={fmtDate(employee.joining_date)} />
              <Detail label="T-Shirt Size" value={employee.tshirt_size} />
              <Detail label="Dietary" value={dietLabel(employee.dietary_preference)} />
              <Detail
                label="Hobbies & Interests"
                value={employee.hobbies}
                full
              />
              <Detail
                label="Address"
                value={[employee.delivery_address, employee.city, employee.pincode]
                  .filter(Boolean)
                  .join(", ")}
                full
              />
              <Detail label="Notes" value={employee.interests} full />
            </dl>
          </TabsContent>

          <TabsContent value="gifts" className="mt-4">
            <EmployeeGiftPanel
              employeeId={employee.id}
              employeeName={employee.name}
            />
          </TabsContent>

          <TabsContent value="occasions" className="mt-4 space-y-2">
            <p className="text-sm text-[#6B7280]">
              Birthday: {fmtDate(employee.date_of_birth)}
            </p>
            <p className="text-sm text-[#6B7280]">
              Work anniversary: {fmtDate(employee.joining_date)}
            </p>
            <Link
              href="/dashboard/occasions"
              className="inline-flex items-center gap-1 text-sm font-semibold text-gold hover:underline"
            >
              <Calendar className="size-3.5" /> View Calendar →
            </Link>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between gap-2 border-t border-[#EDE9E3] p-4">
          <Button
            variant="outline"
            onClick={toggleActive}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : employee.is_active ? (
              "Deactivate"
            ) : (
              "Reactivate"
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={busy}>
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this employee?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes {employee.name} from your active team list. You
                  can re-add them later if needed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={remove}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Detail({
  label,
  value,
  full,
}: {
  label: string;
  value?: string | null;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-xs uppercase tracking-wide text-[#9CA3AF]">{label}</dt>
      <dd className="mt-0.5 text-[#333333]">{value || "—"}</dd>
    </div>
  );
}
