"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { INDUSTRIES, EMPLOYEE_COUNTS } from "@/lib/auth-types";
import type { CompanyInput, Lead } from "@/lib/engines/lead";

interface LeadConvertDialogProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: CompanyInput) => Promise<void>;
}

/** Converts a lead into a client company, pre-filled from lead data. */
export function LeadConvertDialog({
  lead,
  open,
  onOpenChange,
  onConfirm,
}: LeadConvertDialogProps) {
  const [name, setName] = useState(lead.company_name);
  const [industry, setIndustry] = useState(lead.company_industry ?? "");
  const [employeeCount, setEmployeeCount] = useState(lead.company_size ?? "");
  const [city, setCity] = useState(lead.company_city ?? "Bangalore");
  const [website, setWebsite] = useState(lead.company_website ?? "");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm({
        name: name.trim(),
        industry: industry || undefined,
        employeeCount: employeeCount || undefined,
        city: city.trim() || undefined,
        website: website.trim() || undefined,
      });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convert to Client</DialogTitle>
          <DialogDescription>
            Creates a company record and links it to this lead. The lead is
            marked won.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="conv-name">Company name *</Label>
            <Input
              id="conv-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Industry</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((i) => (
                  <SelectItem key={i} value={i}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Employee count</Label>
            <Select value={employeeCount} onValueChange={setEmployeeCount}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYEE_COUNTS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="conv-city">City</Label>
              <Input
                id="conv-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="conv-web">Website</Label>
              <Input
                id="conv-web"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={busy || !name.trim()}>
            {busy ? "Converting…" : "Convert to Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
