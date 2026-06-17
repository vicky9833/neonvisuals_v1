import type { ArchetypeName } from "@/lib/types/employee";

export interface ArchetypeDetail {
  name: ArchetypeName;
  signals: string;
  values: string;
  /** lucide-react icon name */
  icon: string;
}

/** The 8 EIGS employee archetypes. */
export const ARCHETYPES: readonly ArchetypeDetail[] = [
  {
    name: "Achiever",
    signals: "Academic signal, competitive wins, awards",
    values: "Recognition, visible progress, status",
    icon: "Trophy",
  },
  {
    name: "Creator",
    signals: "Design portfolio, blog, art, visual identity",
    values: "Aesthetic objects, craft, expression",
    icon: "Palette",
  },
  {
    name: "Explorer",
    signals: "Travel, trekking, multiple cities, nature",
    values: "Utility, journey, place-based gifts",
    icon: "Compass",
  },
  {
    name: "Builder",
    signals: "Engineering, GitHub, side projects, startups",
    values: "Tools, structure, maker logic",
    icon: "Hammer",
  },
  {
    name: "Root",
    signals: "Strong hometown signal, regional identity",
    values: "Cultural specificity, origin pride",
    icon: "Sprout",
  },
  {
    name: "Connector",
    signals: "Team sports, community, mentoring, HR",
    values: "Social warmth, inclusion, group signals",
    icon: "Users",
  },
  {
    name: "Scholar",
    signals: "Publications, deep specialization, research",
    values: "Thoughtful, reference-rich, book-led gifts",
    icon: "BookOpen",
  },
  {
    name: "Minimalist",
    signals: "Sparse profile, stable career, little public signal",
    values: "Quiet premium, restraint, function",
    icon: "Minus",
  },
] as const;
