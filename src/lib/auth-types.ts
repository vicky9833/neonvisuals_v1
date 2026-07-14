/**
 * Shared auth types for Neon Visuals.
 *
 * This module is import-safe from BOTH server and client components - it must
 * never import `next/headers`, server-only Supabase clients, or any runtime.
 */

export type Role = "super_admin" | "admin" | "client";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: Role;
  company_id: string | null;
  avatar_url: string | null;
  is_onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string | null;
  industry: string | null;
  employee_count: string | null;
  city: string | null;
  address: string | null;
  website: string | null;
  logo_url: string | null;
  gstin: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  gifting_budget: string | null;
  gifting_occasions: string[] | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/** Profile joined with its company (returned by /api/auth/profile). */
export interface ProfileWithCompany extends Profile {
  company: Company | null;
}

/** Result shape for client-side auth helpers. */
export interface AuthResult {
  ok: boolean;
  error?: string;
  /** True when a session was established immediately (no email confirmation). */
  hasSession?: boolean;
}

/** Payload collected by the onboarding wizard. */
export interface OnboardingData {
  companyName: string;
  industry: string;
  employeeCount: string;
  city: string;
  website?: string;
  giftingOccasions: string[];
  giftingBudget?: string;
}

/** Result of completing onboarding. */
export interface OnboardingResult {
  ok: boolean;
  error?: string;
  companyName?: string;
}

/** Industries offered in onboarding step 1. */
export const INDUSTRIES = [
  "Technology / SaaS",
  "Fintech",
  "D2C / E-commerce",
  "Healthcare",
  "Consulting",
  "Real Estate",
  "Education",
  "Manufacturing",
  "Media / Entertainment",
  "Other",
] as const;

/** Employee-count ranges (stored as the label string). */
export const EMPLOYEE_COUNTS = [
  "10-50",
  "50-200",
  "200-500",
  "500-1,000",
  "1,000+",
] as const;

/** Gifting occasions offered in onboarding step 2. */
export const GIFTING_OCCASIONS = [
  "New joiner onboarding",
  "Work anniversaries / milestones",
  "Star performer / CEO recognition",
  "Festive & seasonal (Diwali, Christmas, etc.)",
  "Client appreciation",
  "Team events / offsites",
  "Not currently gifting - exploring options",
] as const;

/** Annual gifting budget ranges. */
export const GIFTING_BUDGETS = [
  "Under ₹1 Lakh",
  "₹1-3 Lakh",
  "₹3-5 Lakh",
  "₹5-10 Lakh",
  "₹10 Lakh+",
  "Prefer not to say",
] as const;

/** Number of gifting events per year. */
export const GIFTING_FREQUENCIES = ["1-2", "3-5", "6-10", "10+"] as const;

/** Whether the Google OAuth button should render (graceful degradation). */
export const GOOGLE_OAUTH_ENABLED =
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true";
