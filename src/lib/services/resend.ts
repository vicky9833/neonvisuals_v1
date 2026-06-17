import { Resend } from "resend";

/**
 * Resend email integration. Server-only. Instantiated lazily so a missing
 * API key doesn't break module load during build.
 */
let client: Resend | null = null;

export function getResend(): Resend {
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

export const FROM_ADDRESS = "Neon Visuals <hello@neonvisuals.in>";
