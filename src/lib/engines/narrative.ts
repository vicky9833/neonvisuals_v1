import type { ArchetypeName } from "@/lib/types/employee";
import { NARRATIVE_TEMPLATES } from "@/data/narrative-templates";

/**
 * Narrative engine — produces the message-card copy that is the soul of
 * the package. Picks an archetype + occasion template, with a graceful
 * fallback when no exact match exists.
 */
export function getNarrative(
  archetype: ArchetypeName,
  occasion: string,
): string {
  const exact = NARRATIVE_TEMPLATES.find(
    (t) => t.archetype === archetype && t.occasion === occasion,
  );
  if (exact) return exact.message;

  const byArchetype = NARRATIVE_TEMPLATES.find(
    (t) => t.archetype === archetype,
  );
  if (byArchetype) return byArchetype.message;

  return "We noticed who you are, and we wanted this moment to feel like it was made for you.";
}
