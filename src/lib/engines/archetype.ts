import type { ArchetypeName, EmployeeBrief } from "@/lib/types/employee";

/**
 * Archetype engine (EIGS). Assigns one of 8 archetypes from a privacy-safe
 * HR brief. The default for zero-signal profiles is "Minimalist" — never
 * invent personality from thin air.
 */

const KEYWORD_MAP: Record<ArchetypeName, string[]> = {
  Achiever: ["award", "rank", "topper", "competitive", "win", "medal"],
  Creator: ["design", "art", "writer", "portfolio", "brand", "music", "photo"],
  Explorer: ["travel", "trek", "hike", "nature", "adventure", "cities"],
  Builder: ["engineer", "developer", "github", "startup", "maker", "build"],
  Root: ["hometown", "regional", "heritage", "village", "roots"],
  Connector: ["mentor", "community", "sports", "team", "volunteer", "hr"],
  Scholar: ["research", "phd", "publication", "academic", "specialist"],
  Minimalist: [],
};

/** Detects the strongest archetype signal from a brief. */
export function detectArchetype(brief: EmployeeBrief): ArchetypeName {
  const haystack = [
    brief.role,
    brief.department,
    brief.hometown,
    brief.acknowledgement,
    ...(brief.interests ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let best: ArchetypeName = "Minimalist";
  let bestScore = 0;

  (Object.keys(KEYWORD_MAP) as ArchetypeName[]).forEach((archetype) => {
    const score = KEYWORD_MAP[archetype].reduce(
      (count, keyword) => (haystack.includes(keyword) ? count + 1 : count),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = archetype;
    }
  });

  return best;
}
