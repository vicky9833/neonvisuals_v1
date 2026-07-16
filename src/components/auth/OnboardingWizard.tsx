"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  LayoutDashboard,
  Loader2,
  PackageOpen,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  EMPLOYEE_COUNTS,
  GIFTING_BUDGETS,
  GIFTING_FREQUENCIES,
  GIFTING_OCCASIONS,
  INDUSTRIES,
  type OnboardingData,
} from "@/lib/auth-types";
import { DPA_ATTESTATION, DPA_DOC_URL } from "@/lib/authz/dpa";
import { createCompanyAndCompleteOnboarding } from "@/app/(auth)/onboarding/actions";

interface FormState {
  companyName: string;
  industry: string;
  employeeCount: string;
  city: string;
  website: string;
  giftingOccasions: string[];
  giftingBudget: string;
  giftingFrequency: string;
  dpaAccepted: boolean;
}

const INITIAL: FormState = {
  companyName: "",
  industry: "",
  employeeCount: "",
  city: "Bangalore",
  website: "",
  giftingOccasions: [],
  giftingBudget: "",
  giftingFrequency: "",
  dpaAccepted: false,
};

export function OnboardingWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savedName, setSavedName] = useState("");

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleOccasion(occasion: string) {
    setForm((prev) => ({
      ...prev,
      giftingOccasions: prev.giftingOccasions.includes(occasion)
        ? prev.giftingOccasions.filter((o) => o !== occasion)
        : [...prev.giftingOccasions, occasion],
    }));
  }

  function handleStep1() {
    setError(null);
    if (
      !form.companyName.trim() ||
      !form.industry ||
      !form.employeeCount ||
      !form.city.trim()
    ) {
      setError("Please fill in all required fields.");
      return;
    }
    setStep(2);
  }

  async function handleStep2() {
    setError(null);
    if (form.giftingOccasions.length === 0) {
      setError("Select at least one occasion you gift for.");
      return;
    }
    if (!form.dpaAccepted) {
      setError("Please confirm the data-sharing authorisation to continue.");
      return;
    }
    setSubmitting(true);
    const payload: OnboardingData = {
      companyName: form.companyName,
      industry: form.industry,
      employeeCount: form.employeeCount,
      city: form.city,
      website: form.website,
      giftingOccasions: form.giftingOccasions,
      giftingBudget:
        form.giftingBudget && form.giftingBudget !== "Prefer not to say"
          ? form.giftingBudget
          : undefined,
      dpaAccepted: form.dpaAccepted,
    };
    const result = await createCompanyAndCompleteOnboarding(payload);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong. Please try again.");
      return;
    }
    setSavedName(result.companyName ?? form.companyName);
    toast.success("Welcome to Neon Visuals!", {
      description: "Your account is ready to go.",
    });
    setStep(3);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <StepIndicator step={step} />

      <div className="mt-8 rounded-2xl border border-[#EDE9E3] bg-white p-8 shadow-sm">
        {step === 1 ? (
          <div className="space-y-6">
            <header>
              <h1 className="font-heading text-2xl font-bold text-navy">
                Let&apos;s Set Up Your Account
              </h1>
              <p className="mt-2 text-sm text-[#6B7280]">
                Tell us about your company so we can personalise your gifting
                experience.
              </p>
            </header>

            <div className="space-y-2">
              <Label htmlFor="companyName">Company name</Label>
              <Input
                id="companyName"
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                className="h-11 rounded-lg"
                placeholder="TechStartup Bangalore"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <select
                id="industry"
                value={form.industry}
                onChange={(e) => update("industry", e.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="" disabled>
                  Select an industry
                </option>
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Employee count</Label>
              <PillGroup
                options={EMPLOYEE_COUNTS}
                value={form.employeeCount}
                onSelect={(v) => update("employeeCount", v)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  className="h-11 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">
                  Website{" "}
                  <span className="text-xs text-[#9CA3AF]">(optional)</span>
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={form.website}
                  onChange={(e) => update("website", e.target.value)}
                  className="h-11 rounded-lg"
                  placeholder="https://"
                />
              </div>
            </div>

            {error ? (
              <p className="text-sm font-medium text-destructive">{error}</p>
            ) : null}

            <Button
              onClick={handleStep1}
              className="h-11 w-full rounded-lg bg-navy text-white hover:bg-navy/90"
            >
              Continue <ArrowRight className="size-4" />
            </Button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <header>
              <h1 className="font-heading text-2xl font-bold text-navy">
                What Does Gifting Look Like at Your Company?
              </h1>
              <p className="mt-2 text-sm text-[#6B7280]">
                This helps us recommend the right products and collections for
                your team.
              </p>
            </header>

            <div className="space-y-3">
              <Label>What occasions do you currently gift for?</Label>
              <div className="space-y-2">
                {GIFTING_OCCASIONS.map((occasion) => (
                  <label
                    key={occasion}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
                      form.giftingOccasions.includes(occasion)
                        ? "border-gold bg-gold/10 text-navy"
                        : "border-[#EDE9E3] hover:bg-secondary",
                    )}
                  >
                    <Checkbox
                      checked={form.giftingOccasions.includes(occasion)}
                      onCheckedChange={() => toggleOccasion(occasion)}
                    />
                    <span>{occasion}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Approximate annual gifting budget{" "}
                <span className="text-xs text-[#9CA3AF]">(optional)</span>
              </Label>
              <PillGroup
                options={GIFTING_BUDGETS}
                value={form.giftingBudget}
                onSelect={(v) => update("giftingBudget", v)}
              />
            </div>

            <div className="space-y-2">
              <Label>How many gifting events per year?</Label>
              <PillGroup
                options={GIFTING_FREQUENCIES}
                value={form.giftingFrequency}
                onSelect={(v) => update("giftingFrequency", v)}
              />
            </div>

            {/* §10 DPA consent — mandatory; org creation is blocked without it. */}
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#EDE9E3] bg-secondary/40 px-4 py-3">
              <Checkbox
                className="mt-0.5"
                checked={form.dpaAccepted}
                onCheckedChange={(v) => update("dpaAccepted", v === true)}
              />
              <span className="text-sm text-[#4B5563]">
                {DPA_ATTESTATION}{" "}
                <a
                  href={DPA_DOC_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-navy underline underline-offset-2"
                >
                  Data Processing Agreement
                </a>
                .
              </span>
            </label>

            {error ? (
              <p className="text-sm font-medium text-destructive">{error}</p>
            ) : null}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setError(null);
                  setStep(1);
                }}
                disabled={submitting}
                className="h-11 rounded-lg"
              >
                Back
              </Button>
              <Button
                onClick={handleStep2}
                disabled={submitting}
                className="h-11 flex-1 rounded-lg bg-navy text-white hover:bg-navy/90"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    Continue <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <header className="text-center">
              <Sparkles className="mx-auto size-8 text-gold" />
              <h1 className="mt-3 font-heading text-2xl font-bold text-navy">
                Welcome to Neon Visuals, {savedName}!
              </h1>
              <p className="mt-2 text-sm text-[#6B7280]">
                Your account is ready. Here&apos;s what you can do next.
              </p>
            </header>

            <div className="space-y-3">
              <ActionCard
                href="/products"
                icon={<PackageOpen className="size-5" />}
                title="Explore Products"
                description="Browse 120+ personalised gifts across 11 collections"
              />
              <ActionCard
                href="/gift-builder"
                icon={<Boxes className="size-5" />}
                title="Curate a Kit"
                description="Build a custom experience kit for your team"
              />
              <ActionCard
                href="/dashboard"
                icon={<LayoutDashboard className="size-5" />}
                title="Go to Dashboard"
                description="Manage your gifting calendar, team, and orders"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const labels = ["About Your Company", "Your Gifting Needs", "All Set"];
  return (
    <div className="flex items-center justify-center gap-2">
      {labels.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const active = step >= n;
        return (
          <div key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                active
                  ? "bg-navy text-white"
                  : "bg-secondary text-[#9CA3AF]",
              )}
            >
              {n}
            </span>
            {i < labels.length - 1 ? (
              <span
                className={cn(
                  "h-px w-8 transition-colors",
                  step > n ? "bg-navy" : "bg-[#EDE9E3]",
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function PillGroup({
  options,
  value,
  onSelect,
}: {
  options: readonly string[];
  value: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option)}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            value === option
              ? "border-navy bg-navy text-white"
              : "border-[#EDE9E3] text-[#6B7280] hover:border-navy/40",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-xl border border-[#EDE9E3] bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-sm"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-navy">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-navy">{title}</span>
        <span className="block text-sm text-[#6B7280]">{description}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-[#9CA3AF]" />
    </Link>
  );
}
