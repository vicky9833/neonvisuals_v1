"use client";

import { useState } from "react";

export interface Organization {
  id: string;
  name: string;
  gstin?: string;
}

/**
 * Provides the active organization (tenant) context. Wired to Supabase in a
 * dedicated task; returns a typed placeholder for now.
 */
export function useOrganization() {
  const [organization] = useState<Organization | null>(null);
  return { organization, loading: false };
}
