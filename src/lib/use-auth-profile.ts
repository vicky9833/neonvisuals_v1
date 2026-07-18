"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface AuthProfileLite {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  is_onboarded: boolean;
  /** Platform-staff flag (from platform_staff), replaces the old profiles.role. */
  isPlatformStaff: boolean;
  /** P9d (R2): the viewer's OWN company (keyed to auth.uid()'s profile) — never a cross-tenant fetch. */
  companyId: string | null;
  companyName: string | null;
}

export interface UseAuthProfile {
  loading: boolean;
  profile: AuthProfileLite | null;
}

/**
 * Client-side auth state for nav UI. Reads the session via the browser client
 * and keeps in sync with auth changes. Keeps marketing pages static - the
 * session is resolved after hydration rather than at request time.
 */
export function useAuthProfile(): UseAuthProfile {
  const [state, setState] = useState<UseAuthProfile>({
    loading: true,
    profile: null,
  });

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (active) setState({ loading: false, profile: null });
        return;
      }

      const [{ data }, { data: staff }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url, is_onboarded, company_id")
          .eq("id", user.id)
          .single(),
        supabase.from("platform_staff").select("user_id").eq("user_id", user.id).maybeSingle(),
      ]);

      // P9d (R2): resolve the viewer's OWN org name (RLS scopes companies to their membership).
      let companyName: string | null = null;
      const companyId = (data?.company_id as string | null) ?? null;
      if (companyId) {
        const { data: co } = await supabase.from("companies").select("name").eq("id", companyId).maybeSingle();
        companyName = (co?.name as string | null) ?? null;
      }

      if (active) {
        setState({
          loading: false,
          profile: data
            ? ({
                id: data.id as string,
                full_name: data.full_name as string,
                email: data.email as string,
                avatar_url: (data.avatar_url as string | null) ?? null,
                is_onboarded: data.is_onboarded as boolean,
                isPlatformStaff: staff != null,
                companyId,
                companyName,
              } as AuthProfileLite)
            : null,
        });
      }
    }

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
