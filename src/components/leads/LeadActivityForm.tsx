"use client";

import { useState } from "react";
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
import type {
  ActivityInput,
  ActivityOutcome,
  ActivityType,
} from "@/lib/engines/lead";

const TYPES: { value: ActivityType; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "call", label: "Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "proposal", label: "Proposal" },
  { value: "follow_up", label: "Follow-up" },
  { value: "sample_sent", label: "Sample Sent" },
  { value: "other", label: "Other" },
];

const OUTCOMES: { value: ActivityOutcome; label: string }[] = [
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
  { value: "no_answer", label: "No Answer" },
  { value: "rescheduled", label: "Rescheduled" },
];

interface LeadActivityFormProps {
  onSubmit: (activity: ActivityInput) => Promise<void>;
}

export function LeadActivityForm({ onSubmit }: LeadActivityFormProps) {
  const [type, setType] = useState<ActivityType>("note");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [outcome, setOutcome] = useState<ActivityOutcome | "">("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [busy, setBusy] = useState(false);

  const showOutcome = type === "call" || type === "meeting";

  async function submit() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await onSubmit({
        activityType: type,
        title: title.trim(),
        description: description.trim() || undefined,
        outcome: showOutcome && outcome ? (outcome as ActivityOutcome) : undefined,
        followUpDate: followUpDate || undefined,
        followUpNote: followUpNote.trim() || undefined,
      });
      setTitle("");
      setDescription("");
      setOutcome("");
      setFollowUpDate("");
      setFollowUpNote("");
      setType("note");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-card border border-border bg-secondary/40 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as ActivityType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {showOutcome && (
          <div className="space-y-1">
            <Label>Outcome</Label>
            <Select
              value={outcome}
              onValueChange={(v) => setOutcome(v as ActivityOutcome)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {OUTCOMES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="act-title">Title *</Label>
        <Input
          id="act-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Discovery call with Priya"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="act-desc">Description</Label>
        <Textarea
          id="act-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="act-fu">Set follow-up</Label>
          <Input
            id="act-fu"
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="act-fu-note">Follow-up note</Label>
          <Input
            id="act-fu-note"
            value={followUpNote}
            onChange={(e) => setFollowUpNote(e.target.value)}
          />
        </div>
      </div>

      <Button onClick={submit} disabled={busy || !title.trim()} size="sm">
        {busy ? "Logging…" : "Log Activity"}
      </Button>
    </div>
  );
}
