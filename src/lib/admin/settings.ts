import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SystemSettings {
  company: {
    businessName: string;
    address: string;
    phone: string;
    email: string;
    whatsapp: string;
    website: string;
    gstin: string;
    pan: string;
    bankName: string;
    bankAccount: string;
    bankIfsc: string;
    upi: string;
  };
  notifications: {
    reminderDays: string;
    quoteValidityDays: string;
    followUpFrequency: string;
  };
  branding: {
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
    tagline: string;
  };
}

export const DEFAULT_SETTINGS: SystemSettings = {
  company: {
    businessName: "Neon Visuals",
    address: "Bengaluru, Karnataka & Mumbai, Maharashtra",
    phone: "+91 90194 09590",
    email: "contact@neonvisuals.in",
    whatsapp: "9019409590",
    website: "neonvisuals.in",
    gstin: "",
    pan: "",
    bankName: "",
    bankAccount: "",
    bankIfsc: "",
    upi: "",
  },
  notifications: {
    reminderDays: "7,3,1,0",
    quoteValidityDays: "15",
    followUpFrequency: "3",
  },
  branding: {
    logoUrl: "",
    primaryColor: "#1A1A2E",
    secondaryColor: "#C4A35A",
    tagline: "Crafted with Intention. Remembered with Pride.",
  },
};

function merge(stored: Partial<SystemSettings> | null): SystemSettings {
  return {
    company: { ...DEFAULT_SETTINGS.company, ...(stored?.company ?? {}) },
    notifications: {
      ...DEFAULT_SETTINGS.notifications,
      ...(stored?.notifications ?? {}),
    },
    branding: { ...DEFAULT_SETTINGS.branding, ...(stored?.branding ?? {}) },
  };
}

export async function getSettings(): Promise<SystemSettings> {
  try {
    const supa = createAdminClient();
    const { data } = await supa
      .from("system_settings")
      .select("settings")
      .eq("id", "global")
      .maybeSingle();
    return merge((data?.settings as Partial<SystemSettings>) ?? null);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(
  settings: SystemSettings,
  userId?: string,
): Promise<SystemSettings> {
  const supa = createAdminClient();
  const { error } = await supa.from("system_settings").upsert({
    id: "global",
    settings,
    updated_at: new Date().toISOString(),
    updated_by: userId ?? null,
  });
  if (error) throw new Error(`Save settings failed: ${error.message}`);
  return settings;
}
