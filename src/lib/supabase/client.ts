import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Browser-side Supabase client for use in Client Components.
 * Uses the public anon key - safe to expose to the browser.
 */
export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
