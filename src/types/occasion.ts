export type CalendarEventType =
  | "birthday"
  | "work_anniversary"
  | "festival"
  | "custom";

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  description?: string;
  date: string; // ISO date — this occurrence
  originalDate?: string; // actual birthday / joining date
  yearsCount?: number;
  employeeId?: string;
  employeeName?: string;
  employeeDepartment?: string;
  festivalId?: string;
  customOccasionId?: string;
  recurrence: "yearly" | "one-time" | "monthly" | "quarterly";
  suggestedCollection?: string;
  suggestedProduct?: string;
  suggestedAction?: string;
  actionUrl?: string;
  color?: string;
}

export interface CustomOccasion {
  id: string;
  company_id: string;
  title: string;
  description?: string | null;
  occasion_date: string;
  recurrence: "none" | "yearly" | "monthly" | "quarterly";
  occasion_type:
    | "custom"
    | "company_anniversary"
    | "team_event"
    | "offsite"
    | "training"
    | "celebration"
    | "other";
  reminder_days_before: number[];
  employee_ids?: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FestivalPreference {
  festival_id: string;
  name: string;
  default_date: string;
  effective_date: string;
  is_active: boolean;
  custom_date: string | null;
  description: string | null;
}

export interface Reminder {
  id: string;
  company_id: string;
  reminder_type: "birthday" | "work_anniversary" | "festival" | "custom_occasion";
  title: string;
  description: string | null;
  occasion_date: string;
  reminder_date: string;
  employee_id: string | null;
  custom_occasion_id: string | null;
  festival_id: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  is_actioned: boolean;
  action_url: string | null;
  created_at: string;
}

export const EVENT_COLORS: Record<CalendarEventType, string> = {
  birthday: "#3B82F6",
  work_anniversary: "#C4A35A",
  festival: "#10B981",
  custom: "#8B5CF6",
};

export const CUSTOM_OCCASION_TYPES = [
  { value: "custom", label: "Custom" },
  { value: "company_anniversary", label: "Company Anniversary" },
  { value: "team_event", label: "Team Event" },
  { value: "offsite", label: "Offsite" },
  { value: "training", label: "Training" },
  { value: "celebration", label: "Celebration" },
  { value: "other", label: "Other" },
] as const;
