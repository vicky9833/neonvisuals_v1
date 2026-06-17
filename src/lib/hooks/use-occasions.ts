"use client";

import { OCCASIONS } from "@/data/occasions";

/** Provides occasion-first navigation entries to client components. */
export function useOccasions() {
  return { occasions: OCCASIONS };
}
