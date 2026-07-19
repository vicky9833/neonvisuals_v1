import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Distributed rate limiter (P10a) backed by the shared `rate_limits` table +
 * `rate_limit_touch()` fixed-window counter (migration 055). Unlike a
 * per-instance in-memory Map, this holds across Vercel lambdas.
 *
 * FAIL-OPEN by design: if the counter query errors (DB blip, missing fn), we
 * DO NOT block — legitimate traffic must never be denied because the limiter
 * itself failed. Enforcement happens only on a confirmed over-limit verdict.
 */
export interface RateLimitOptions {
  /** Logical bucket, e.g. "leads_capture" | "contact" | "razorpay_webhook". */
  bucket: string;
  /** Per-caller key (usually the client IP). */
  identifier: string;
  /** Window length in seconds. */
  windowSeconds: number;
  /** Max hits allowed within the window before `limited` becomes true. */
  max: number;
}

/**
 * Atomically record a hit and report whether the caller is OVER the limit.
 * Returns `{ limited: false }` on any error (fail-open).
 */
export async function checkRateLimit(opts: RateLimitOptions): Promise<{ limited: boolean }> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("rate_limit_touch", {
      p_bucket: opts.bucket,
      p_identifier: opts.identifier,
      p_window_seconds: opts.windowSeconds,
      p_max: opts.max,
    });
    if (error) return { limited: false }; // fail-open on limiter error
    return { limited: data === true };
  } catch {
    return { limited: false }; // fail-open on unexpected error
  }
}

/** Best-effort client IP for keying, from the standard proxy headers. */
export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
