/**
 * Centralised, validated access to environment variables.
 *
 * IMPORTANT: `NEXT_PUBLIC_*` variables are only inlined into the client bundle
 * when referenced as STATIC literals (e.g. `process.env.NEXT_PUBLIC_SUPABASE_URL`).
 * Dynamic access like `process.env[key]` is NOT replaced by the bundler and
 * reads as `undefined` in the browser. All public vars below are therefore
 * accessed statically. Optional integration keys degrade gracefully.
 */

// Static references so Next.js/Turbopack inlines them into the client bundle.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseAnonKey) {
  throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export const env = {
  // Required — the app cannot function without Supabase.
  supabaseUrl,
  supabaseAnonKey,

  // Public site URL (defaults to production origin).
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://neonvisuals.in",

  // Optional integrations — graceful degradation when absent.
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
  resendApiKey: process.env.RESEND_API_KEY || "",
  gaId: process.env.NEXT_PUBLIC_GA_ID || "",
} as const;
