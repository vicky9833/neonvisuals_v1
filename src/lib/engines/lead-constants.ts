/**
 * Pure lead/CRM constants — CLIENT-SAFE (no server imports).
 *
 * Imported by client components (LeadDetail, LeadLossDialog). They live here,
 * separate from the server-only `lead.ts` engine (which imports the
 * request-scoped Supabase client), so importing them never pulls
 * `next/headers` into the client bundle. `lead.ts` re-exports them for servers.
 */
import type { LeadStatus } from "./lead";

export const PIPELINE_STAGES: { status: LeadStatus; label: string }[] = [
  { status: "new", label: "New" },
  { status: "contacted", label: "Contacted" },
  { status: "qualified", label: "Qualified" },
  { status: "proposal_sent", label: "Proposal" },
  { status: "negotiation", label: "Negotiation" },
  { status: "won", label: "Won" },
  { status: "lost", label: "Lost" },
];

/** Statuses still "in play" - used for pipeline value + overdue follow-ups. */
export const ACTIVE_LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
];

export const LOSS_REASONS = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "chose_competitor", label: "Chose competitor" },
  { value: "no_budget", label: "No budget" },
  { value: "no_response", label: "No response" },
  { value: "timing", label: "Bad timing" },
  { value: "other", label: "Other" },
] as const;
