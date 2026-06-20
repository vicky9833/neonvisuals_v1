import type {
  ActivityType,
  LeadPriority,
  LeadSource,
  LeadStatus,
} from "@/lib/engines/lead";

export const STATUS_META: Record<
  LeadStatus,
  { label: string; badge: string; dot: string; column: string }
> = {
  new: {
    label: "New",
    badge: "bg-gray-100 text-gray-700 border-gray-200",
    dot: "bg-gray-400",
    column: "border-t-gray-400",
  },
  contacted: {
    label: "Contacted",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    column: "border-t-blue-500",
  },
  qualified: {
    label: "Qualified",
    badge: "bg-cyan-50 text-cyan-700 border-cyan-200",
    dot: "bg-cyan-500",
    column: "border-t-cyan-500",
  },
  proposal_sent: {
    label: "Proposal",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
    column: "border-t-violet-500",
  },
  negotiation: {
    label: "Negotiation",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    column: "border-t-amber-500",
  },
  won: {
    label: "Won",
    badge: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-500",
    column: "border-t-green-500",
  },
  lost: {
    label: "Lost",
    badge: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
    column: "border-t-red-400",
  },
  dormant: {
    label: "Dormant",
    badge: "bg-stone-100 text-stone-600 border-stone-200",
    dot: "bg-stone-400",
    column: "border-t-stone-400",
  },
};

export const PRIORITY_META: Record<
  LeadPriority,
  { label: string; dot: string; text: string }
> = {
  hot: { label: "Hot", dot: "bg-red-500", text: "text-red-600" },
  warm: { label: "Warm", dot: "bg-orange-500", text: "text-orange-600" },
  medium: { label: "Medium", dot: "bg-amber-400", text: "text-amber-600" },
  cold: { label: "Cold", dot: "bg-sky-400", text: "text-sky-600" },
};

export const SOURCE_LABEL: Record<LeadSource, string> = {
  whatsapp: "WhatsApp",
  website: "Website",
  gift_builder: "Gift Builder",
  linkedin: "LinkedIn",
  referral: "Referral",
  event: "Event",
  cold_outreach: "Cold Outreach",
  google: "Google",
  instagram: "Instagram",
  other: "Other",
};

export const ACTIVITY_META: Record<
  ActivityType,
  { label: string; icon: string }
> = {
  note: { label: "Note", icon: "📝" },
  call: { label: "Call", icon: "📞" },
  whatsapp: { label: "WhatsApp", icon: "📱" },
  email: { label: "Email", icon: "📧" },
  meeting: { label: "Meeting", icon: "🤝" },
  proposal: { label: "Proposal", icon: "📄" },
  follow_up: { label: "Follow-up", icon: "🔔" },
  sample_sent: { label: "Sample Sent", icon: "📦" },
  status_change: { label: "Status Change", icon: "🔄" },
  quote_created: { label: "Quote Created", icon: "🧾" },
  order_placed: { label: "Order Placed", icon: "✅" },
  other: { label: "Other", icon: "•" },
};

export const OUTCOME_META: Record<string, { label: string; badge: string }> = {
  positive: { label: "Positive", badge: "bg-green-50 text-green-700" },
  neutral: { label: "Neutral", badge: "bg-gray-100 text-gray-600" },
  negative: { label: "Negative", badge: "bg-red-50 text-red-700" },
  no_answer: { label: "No Answer", badge: "bg-amber-50 text-amber-700" },
  rescheduled: { label: "Rescheduled", badge: "bg-blue-50 text-blue-700" },
};

/** Occasion interest options for the lead form. */
export const LEAD_OCCASIONS = [
  { value: "onboarding", label: "Onboarding" },
  { value: "milestone", label: "Milestone" },
  { value: "festive", label: "Festive" },
  { value: "recognition", label: "Recognition" },
  { value: "client", label: "Client Appreciation" },
  { value: "events", label: "Events" },
] as const;

export const LEAD_SOURCES: { value: LeadSource; label: string }[] = (
  Object.keys(SOURCE_LABEL) as LeadSource[]
).map((value) => ({ value, label: SOURCE_LABEL[value] }));
