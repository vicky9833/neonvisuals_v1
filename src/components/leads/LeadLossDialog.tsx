"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { LOSS_REASONS } from "@/lib/engines/lead-constants";

interface LeadLossDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, notes?: string) => Promise<void>;
}

export function LeadLossDialog({
  open,
  onOpenChange,
  onConfirm,
}: LeadLossDialogProps) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!reason) return;
    setBusy(true);
    try {
      await onConfirm(reason, notes.trim() || undefined);
      onOpenChange(false);
      setReason("");
      setNotes("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Lead as Lost</DialogTitle>
          <DialogDescription>
            A loss reason is required and recorded in the lead history.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Loss reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {LOSS_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="loss-notes">Notes</Label>
            <Textarea
              id="loss-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={busy || !reason}>
            {busy ? "Saving…" : "Mark as Lost"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
