import type { ArchetypeName } from "@/lib/types/employee";

/** Message-card narrative templates keyed by archetype + occasion. */
export interface NarrativeTemplate {
  archetype: ArchetypeName;
  /** Occasion slug, e.g. "onboarding", "work-anniversary". */
  occasion: string;
  message: string;
}

export const NARRATIVE_TEMPLATES: readonly NarrativeTemplate[] = [
  {
    archetype: "Achiever",
    occasion: "onboarding",
    message:
      "You have spent your career choosing hard things and finishing them well. Today is your first day here, and we wanted the welcome to match the standard you already set for yourself.",
  },
  {
    archetype: "Achiever",
    occasion: "work-anniversary",
    message:
      "A year in, you have done what achievers do: you raised the bar and then made it look normal. This is the company's way of saying we noticed.",
  },
  {
    archetype: "Creator",
    occasion: "onboarding",
    message:
      "You have an eye for detail that most people never build. We wanted your first day to feel designed, not assembled.",
  },
  {
    archetype: "Builder",
    occasion: "onboarding",
    message:
      "You have spent time making things that did not exist before. That is the right energy for building here, and we wanted day one to reflect that.",
  },
  {
    archetype: "Explorer",
    occasion: "onboarding",
    message:
      "You move with curiosity, and that changes the room when you arrive. Your first day should feel like the start of a wider map, not just a job.",
  },
] as const;
