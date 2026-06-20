"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/services/email";
import type { OnboardingData, OnboardingResult } from "@/lib/auth-types";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "company"}-${suffix}`;
}

/**
 * Creates the company record and flips the profile to onboarded. Company
 * inserts are privileged (no client INSERT policy), so this runs with the
 * service-role client after verifying the session.
 */
export async function createCompanyAndCompleteOnboarding(
  data: OnboardingData,
): Promise<OnboardingResult> {
  // 1. Verify the session via the request-scoped (cookie) client.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  if (!data.companyName.trim()) {
    return { ok: false, error: "Company name is required." };
  }
  if (data.giftingOccasions.length === 0) {
    return { ok: false, error: "Select at least one gifting occasion." };
  }

  const admin = createAdminClient();

  // Read the profile for primary-contact details.
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user.id)
    .single();

  // 2 + 3. Insert company.
  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({
      name: data.companyName.trim(),
      slug: slugify(data.companyName),
      industry: data.industry || null,
      employee_count: data.employeeCount || null,
      city: data.city || "Bangalore",
      website: data.website?.trim() || null,
      gifting_occasions: data.giftingOccasions,
      gifting_budget: data.giftingBudget || null,
      onboarding_completed: true,
      primary_contact_name: profile?.full_name ?? null,
      primary_contact_email: profile?.email ?? user.email ?? null,
      primary_contact_phone: profile?.phone ?? null,
      created_by: user.id,
    })
    .select("id, name")
    .single();

  if (companyError || !company) {
    return {
      ok: false,
      error: companyError?.message ?? "Could not create company.",
    };
  }

  // 4. Link profile to the company and mark onboarded.
  const { error: profileError } = await admin
    .from("profiles")
    .update({ company_id: company.id, is_onboarded: true })
    .eq("id", user.id);

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  // Fire-and-forget branded welcome email.
  const welcomeTo = profile?.email ?? user.email ?? null;
  if (welcomeTo) {
    void sendWelcomeEmail({
      to: welcomeTo,
      name: profile?.full_name ?? "there",
      companyName: company.name,
    }).catch((err) => console.error("[Email] Welcome failed:", err));
  }

  return { ok: true, companyName: company.name };
}
