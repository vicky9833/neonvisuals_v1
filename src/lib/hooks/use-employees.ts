"use client";

import { useState } from "react";
import type { Employee } from "@/lib/types/employee";

/**
 * Provides the organization's employees. Wired to Supabase in a dedicated
 * task; returns a typed placeholder for now.
 */
export function useEmployees() {
  const [employees] = useState<Employee[]>([]);
  return { employees, loading: false };
}
