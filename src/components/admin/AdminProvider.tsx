"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Profile } from "@/lib/auth-types";

interface AdminContextValue {
  profile: Profile;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  pageTitle: string;
  setPageTitle: (title: string) => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return ctx;
}

export function AdminProvider({
  profile,
  children,
}: {
  profile: Profile;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState("Command Center");

  const value = useMemo<AdminContextValue>(
    () => ({ profile, sidebarOpen, setSidebarOpen, pageTitle, setPageTitle }),
    [profile, sidebarOpen, pageTitle],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

/** Renders nothing - sets the admin topbar title for the current page. */
export function SetAdminPageTitle({ title }: { title: string }) {
  const { setPageTitle } = useAdmin();
  useEffect(() => {
    setPageTitle(title);
  }, [title, setPageTitle]);
  return null;
}
