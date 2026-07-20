"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/services/rate-limit";
import { sendWelcomeEmail } from "@/lib/services/email";
import { DPA_VERSION } from "@/lib/authz/dpa";
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
  // DPA §10 consent is MANDATORY — no company is created without it.
  if (!data.dpaAccepted) {
    return {
      ok: false,
      error:
        "You must confirm you're authorised to share your employees' data before creating your organisation.",
    };
  }

  // Capture the accepting IP for the DPA consent record (best-effort).
  const hdrs = await headers();
  const dpaIp =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    null;

  // Rate-limit self-serve org creation per IP (P10a shared-DB limiter). Opening public signup opens
  // a public write path — this blocks junk-org scripting. Fail-open (a limiter error never blocks a
  // legitimate signup); enforce only on a confirmed over-limit verdict. Auth (GoTrue) has its own
  // platform-level rate limiting; this guards OUR org-creation write specifically.
  const rl = await checkRateLimit({
    bucket: "org_create",
    identifier: dpaIp ?? "unknown",
    windowSeconds: 3600,
    max: 5,
  });
  if (rl.limited) {
    return {
      ok: false,
      error:
        "Too many organisations have been created from this network recently. Please try again later, or contact us to get set up.",
    };
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
      owner_id: user.id,
      // DPA §10 consent record (mandatory; blocked above if not accepted).
      dpa_accepted_at: new Date().toISOString(),
      dpa_accepted_by: user.id,
      dpa_version: DPA_VERSION,
      dpa_ip: dpaIp,
    })
    .select("id, name")
    .single();

  if (companyError || !company) {
    return {
      ok: false,
      error: companyError?.message ?? "Could not create company.",
    };
  }

  // 4. Write the TENANT-PLANE membership (source of truth for authz + scoping,
  //    Prompt 2 item 5): the creator is the org_owner. Elevated client is
  //    justified — the membership does not exist yet, so RLS can't authorise it.
  const { error: memberError } = await admin.from("company_members").insert({
    company_id: company.id,
    user_id: user.id,
    role: "org_owner",
    status: "active",
  });
  if (memberError) {
    return { ok: false, error: memberError.message };
  }

  // 5. Mark onboarded. profiles.company_id is retained ONLY for the
  //    getProfile() company-display join; all tenant-scoping READS now key on
  //    company_members (see src/lib/api-auth.ts requireApiAuth).
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
    // Awaited (serverless-safe): a server action is frozen after it returns,
    // so a fire-and-forget send is dropped on Vercel. Wrapped so it can't
    // fail onboarding completion.
    await sendWelcomeEmail({
      to: welcomeTo,
      name: profile?.full_name ?? "there",
      companyName: company.name,
    }).catch((err) => console.error("[Email] Welcome failed:", err));
  }

  return { ok: true, companyName: company.name };
}
