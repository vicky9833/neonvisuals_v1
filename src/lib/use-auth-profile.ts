"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/auth-types";

export interface AuthProfileLite {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  avatar_url: string | null;
  is_onboarded: boolean;
}

export interface UseAuthProfile {
  loading: boolean;
  profile: AuthProfileLite | null;
}

/**
 * Client-side auth state for nav UI. Reads the session via the browser client
 * and keeps in sync with auth changes. Keeps marketing pages static — the
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

      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, avatar_url, is_onboarded")
        .eq("id", user.id)
        .single();

      if (active) {
        setState({
          loading: false,
          profile: (data as AuthProfileLite | null) ?? null,
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
