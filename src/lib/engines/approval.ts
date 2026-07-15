import type { QuoteStatus } from "@/lib/types/quote";

/**
 * Approval engine - governs the quote/order approval lifecycle and the
 * allowed status transitions. Full workflow rules land in a dedicated task.
 */
const ALLOWED_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ["sent"],
  sent: ["viewed", "expired"],
  viewed: ["approved", "rejected", "expired"],
  approved: [],
  rejected: [],
  expired: [],
};

/** Returns whether a quote status transition is permitted. */
export function canTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
