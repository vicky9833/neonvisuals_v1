"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Company, Profile } from "@/lib/auth-types";

/** P9d (R1): the viewer's OWN org branding for the portal shell (plain data; NEON fallback applied server-side). */
export interface ShellBranding {
  orgName: string;
  logoUrl: string | null;
  primary: string;
  accent: string;
}

interface DashboardContextValue {
  profile: Profile;
  company: Company | null;
  branding: ShellBranding;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  pageTitle: string;
  setPageTitle: (title: string) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return ctx;
}

export function DashboardProvider({
  profile,
  company,
  branding,
  children,
}: {
  profile: Profile;
  company: Company | null;
  branding: ShellBranding;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState("Overview");

  const value = useMemo<DashboardContextValue>(
    () => ({
      profile,
      company,
      branding,
      sidebarOpen,
      setSidebarOpen,
      pageTitle,
      setPageTitle,
    }),
    [profile, company, branding, sidebarOpen, pageTitle],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

/** Renders nothing - sets the topbar title for the current page. */
export function SetPageTitle({ title }: { title: string }) {
  const { setPageTitle } = useDashboard();
  useEffect(() => {
    setPageTitle(title);
  }, [title, setPageTitle]);
  return null;
}
