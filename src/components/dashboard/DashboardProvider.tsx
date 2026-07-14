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

interface DashboardContextValue {
  profile: Profile;
  company: Company | null;
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
  children,
}: {
  profile: Profile;
  company: Company | null;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState("Overview");

  const value = useMemo<DashboardContextValue>(
    () => ({
      profile,
      company,
      sidebarOpen,
      setSidebarOpen,
      pageTitle,
      setPageTitle,
    }),
    [profile, company, sidebarOpen, pageTitle],
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
