"use client";

import { createClient } from "@/lib/supabase/client";
import type { AuthResult } from "@/lib/auth-types";

/**
 * Browser-side auth helpers for use inside "use client" components.
 * Each helper creates a request-scoped browser Supabase client.
 */

function authCallbackUrl(next?: string): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const url = new URL("/auth/callback", origin);
  if (next) url.searchParams.set("next", next);
  return url.toString();
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  phone?: string,
): Promise<AuthResult> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Consumed by the handle_new_user() trigger.
      data: { full_name: fullName, phone: phone ?? null },
      emailRedirectTo: authCallbackUrl("/onboarding"),
    },
  });

  if (error) return { ok: false, error: error.message };

  const hasSession = Boolean(data.session);

  // If a session exists immediately (email confirmation off), persist phone.
  if (hasSession && phone) {
    await supabase
      .from("profiles")
      .update({ phone })
      .eq("id", data.user!.id);
  }

  return { ok: true, hasSession };
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, hasSession: true };
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: authCallbackUrl("/dashboard") },
  });
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export async function resetPassword(email: string): Promise<AuthResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: authCallbackUrl("/dashboard"),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updatePassword(
  newPassword: string,
): Promise<AuthResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
