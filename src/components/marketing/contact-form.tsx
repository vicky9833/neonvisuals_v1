"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PHONE, SUPPORT_EMAIL, WHATSAPP_URL } from "@/lib/utils/constants";
import { isValidIndianMobile } from "@/lib/utils/form-validation";
import { ErrorBoundary } from "@/components/shared/error-boundary";

/* ------------------------------------------------------------------ */
/* Options                                                             */
/* ------------------------------------------------------------------ */

const OCCASION_OPTIONS = [
  "Employee Onboarding",
  "Work Anniversary",
  "Diwali / Festive",
  "Client Appreciation",
  "CEO Recognition",
  "College Event / Fest",
  "Conference / Summit",
  "Awards & Recognition",
  "Other",
] as const;

const TEAM_SIZE_OPTIONS = ["1-25", "26-100", "101-500", "500+"] as const;

const MESSAGE_MAX = 500;

/** Slug/keyword hints → canonical occasion label. */
const OCCASION_SLUG_MAP: Record<string, (typeof OCCASION_OPTIONS)[number]> = {
  onboarding: "Employee Onboarding",
  welcome: "Employee Onboarding",
  "work-anniversary": "Work Anniversary",
  anniversary: "Work Anniversary",
  diwali: "Diwali / Festive",
  festive: "Diwali / Festive",
  seasonal: "Diwali / Festive",
  "client-appreciation": "Client Appreciation",
  client: "Client Appreciation",
  "ceo-recognition": "CEO Recognition",
  ceo: "CEO Recognition",
  leadership: "CEO Recognition",
  "college-fest": "College Event / Fest",
  "college-event": "College Event / Fest",
  college: "College Event / Fest",
  fest: "College Event / Fest",
  event: "College Event / Fest",
  conference: "Conference / Summit",
  summit: "Conference / Summit",
  awards: "Awards & Recognition",
  milestones: "Awards & Recognition",
  farewell: "Other",
};

/** Resolve an initial occasion value to a valid option label. */
function resolveInitialOccasion(initial?: string): string {
  if (!initial) return "";
  const raw = initial.trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();

  // Case-insensitive match against the option labels.
  const labelMatch = OCCASION_OPTIONS.find(
    (opt) => opt.toLowerCase() === lower,
  );
  if (labelMatch) return labelMatch;

  // Slug map (normalise spaces/underscores to hyphens).
  const slug = lower.replace(/[\s_]+/g, "-");
  if (OCCASION_SLUG_MAP[slug]) return OCCASION_SLUG_MAP[slug];

  return "Other";
}

/* ------------------------------------------------------------------ */
/* Schema                                                              */
/* ------------------------------------------------------------------ */

const contactSchema = z.object({
  name: z.string().min(1, "Please enter your name").max(120),
  company: z
    .string()
    .min(1, "Please enter your company or organization")
    .max(160),
  email: z
    .string()
    .min(1, "Please enter your email")
    .email("Please enter a valid email address"),
  phone: z
    .string()
    .min(1, "Please enter your phone number")
    .refine(isValidIndianMobile, "Enter a valid 10-digit Indian mobile number"),
  occasion: z.string().min(1, "Please select an occasion"),
  teamSize: z.string().optional(),
  deliveryDate: z.string().optional(),
  message: z
    .string()
    .max(MESSAGE_MAX, `Please keep it under ${MESSAGE_MAX} characters`)
    .optional(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface ContactFormProps {
  initialOccasion?: string;
}

export function ContactForm({ initialOccasion }: ContactFormProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      company: "",
      email: "",
      phone: "",
      occasion: resolveInitialOccasion(initialOccasion),
      teamSize: "",
      deliveryDate: "",
      message: "",
    },
  });

  const messageValue = form.watch("message") ?? "";

  async function onSubmit(values: ContactFormValues) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/leads/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          company: values.company,
          email: values.email,
          phone: values.phone,
          occasion: values.occasion,
          teamSize: values.teamSize || undefined,
          deliveryDate: values.deliveryDate || undefined,
          message: values.message || undefined,
          source: "contact_form",
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      toast.success("Thank you! We'll get back to you within 2 hours.");
      form.reset({
        name: "",
        company: "",
        email: "",
        phone: "",
        occasion: "",
        teamSize: "",
        deliveryDate: "",
        message: "",
      });
    } catch {
      toast.error("Something went wrong. Please WhatsApp or call us.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ErrorBoundary>
      <div className="rounded-2xl border border-[#EDE9E3] bg-white p-6 shadow-sm sm:p-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company / Organization</FormLabel>
                  <FormControl>
                    <Input placeholder="Company or organization" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@company.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      inputMode="tel"
                      placeholder="10-digit mobile"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="occasion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Occasion</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an occasion" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {OCCASION_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="teamSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Approximate Team Size</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select team size" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TEAM_SIZE_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="deliveryDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expected Delivery Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    maxLength={MESSAGE_MAX}
                    placeholder="Tell us about your requirement, budget, or any preferences."
                    {...field}
                  />
                </FormControl>
                <div className="flex items-center justify-between">
                  <FormMessage />
                  <span className="ml-auto text-xs text-[#999999]">
                    {messageValue.length}/{MESSAGE_MAX}
                  </span>
                </div>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={submitting || !form.formState.isValid}
            className="h-12 w-full rounded-full bg-navy text-[15px] font-semibold text-white hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit Enquiry"}
          </Button>

          <p className="text-center text-sm text-[#666666]">
            Prefer to talk?{" "}
            <a
              href={`tel:${PHONE.replace(/\s/g, "")}`}
              className="font-semibold text-navy hover:text-gold"
            >
              📞 Call
            </a>{" "}
            ·{" "}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-navy hover:text-gold"
            >
              💬 WhatsApp
            </a>{" "}
            ·{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-semibold text-navy hover:text-gold"
            >
              📧 Email
            </a>
          </p>
        </form>
      </Form>
      </div>
    </ErrorBoundary>
  );
}
