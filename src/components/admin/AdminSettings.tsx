"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SystemSettings } from "@/lib/admin/settings";

interface AdminSettingsProps {
  initial: SystemSettings;
  razorpayConfigured: boolean;
}

type Section = keyof SystemSettings;

export function AdminSettings({ initial, razorpayConfigured }: AdminSettingsProps) {
  const [settings, setSettings] = useState<SystemSettings>(initial);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function set<S extends Section>(
    section: S,
    key: keyof SystemSettings[S],
    value: string,
  ) {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  }

  async function save() {
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setToast(res.ok ? "Settings saved." : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-3">
        {toast && <span className="text-sm text-[#6B7280]">{toast}</span>}
        <Button onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save Settings"}
        </Button>
      </div>

      <Tabs defaultValue="company">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="company">Company Details</TabsTrigger>
          <TabsTrigger value="payment">Payment Gateway</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Business name" value={settings.company.businessName} onChange={(v) => set("company", "businessName", v)} />
            <F label="Phone" value={settings.company.phone} onChange={(v) => set("company", "phone", v)} />
            <F label="Email" value={settings.company.email} onChange={(v) => set("company", "email", v)} />
            <F label="WhatsApp" value={settings.company.whatsapp} onChange={(v) => set("company", "whatsapp", v)} />
            <F label="Website" value={settings.company.website} onChange={(v) => set("company", "website", v)} />
            <F label="Address" value={settings.company.address} onChange={(v) => set("company", "address", v)} />
            <F label="GSTIN" value={settings.company.gstin} onChange={(v) => set("company", "gstin", v)} />
            <F label="PAN" value={settings.company.pan} onChange={(v) => set("company", "pan", v)} />
          </div>
          <h3 className="font-heading mt-6 mb-3 text-sm font-semibold text-navy">
            Bank details (for invoices)
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Account name" value={settings.company.bankName} onChange={(v) => set("company", "bankName", v)} />
            <F label="Account number" value={settings.company.bankAccount} onChange={(v) => set("company", "bankAccount", v)} />
            <F label="IFSC" value={settings.company.bankIfsc} onChange={(v) => set("company", "bankIfsc", v)} />
            <F label="UPI" value={settings.company.upi} onChange={(v) => set("company", "upi", v)} />
          </div>
        </TabsContent>

        <TabsContent value="payment" className="mt-4 space-y-3">
          <div className="flex items-center gap-2 rounded-card border border-border bg-secondary/40 p-4">
            {razorpayConfigured ? (
              <>
                <CheckCircle2 className="size-5 text-green-600" />
                <span className="text-sm font-medium text-navy">Razorpay Connected</span>
              </>
            ) : (
              <>
                <AlertTriangle className="size-5 text-amber-500" />
                <span className="text-sm font-medium text-navy">
                  Razorpay not configured
                </span>
              </>
            )}
          </div>
          <p className="text-sm text-[#6B7280]">
            Razorpay keys are managed via environment variables
            (<code className="font-mono text-xs">RAZORPAY_KEY_ID</code>,{" "}
            <code className="font-mono text-xs">RAZORPAY_KEY_SECRET</code>,{" "}
            <code className="font-mono text-xs">RAZORPAY_WEBHOOK_SECRET</code>) for
            security. Update them in your hosting environment, not here.
          </p>
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <div className="flex items-center gap-2 rounded-card border border-border bg-secondary/40 p-4">
            <AlertTriangle className="size-5 text-amber-500" />
            <span className="text-sm text-[#6B7280]">
              Resend email is not configured yet - coming in Prompt 20.
            </span>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Reminder days before (comma-separated)" value={settings.notifications.reminderDays} onChange={(v) => set("notifications", "reminderDays", v)} />
            <F label="Quote validity (days)" value={settings.notifications.quoteValidityDays} onChange={(v) => set("notifications", "quoteValidityDays", v)} />
            <F label="Follow-up frequency (days)" value={settings.notifications.followUpFrequency} onChange={(v) => set("notifications", "followUpFrequency", v)} />
          </div>
        </TabsContent>

        <TabsContent value="branding" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Logo URL" value={settings.branding.logoUrl} onChange={(v) => set("branding", "logoUrl", v)} />
            <F label="Tagline" value={settings.branding.tagline} onChange={(v) => set("branding", "tagline", v)} />
            <F label="Primary colour" value={settings.branding.primaryColor} onChange={(v) => set("branding", "primaryColor", v)} />
            <F label="Secondary colour" value={settings.branding.secondaryColor} onChange={(v) => set("branding", "secondaryColor", v)} />
          </div>
          <p className="mt-3 text-xs text-[#9CA3AF]">
            Branding values are informational - the live design system is defined
            in code.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function F({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
