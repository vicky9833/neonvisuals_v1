import { NextResponse } from "next/server";
import { z } from "zod";
import { captureLead, type LeadSource } from "@/lib/engines/lead";
import { sendNewLeadAlertEmail } from "@/lib/services/email";

export const runtime = "nodejs";

/**
 * PUBLIC endpoint - no auth. Captures gift builder / website enquiries as leads.
 * Returns only { success } and never exposes lead data. Simple in-memory rate
 * limit of 10 requests per IP per hour (resets on server restart / per instance).
 */

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
  company: z.string().min(1).max(160),
  occasion: z.string().max(80).optional(),
  teamSize: z.string().max(40).optional(),
  deliveryDate: z.string().max(40).optional(),
  message: z.string().max(1000).optional(),
  products: z
    .array(z.object({ sku: z.string(), name: z.string().optional() }))
    .optional(),
  source: z.string().max(40).optional(),
});

/** Valid lead sources accepted by the CRM (mirrors the DB CHECK constraint). */
const VALID_SOURCES = new Set<LeadSource>([
  "whatsapp",
  "website",
  "gift_builder",
  "linkedin",
  "referral",
  "event",
  "cold_outreach",
  "google",
  "instagram",
  "other",
]);

/**
 * Narrow the free-form `source` to a valid {@link LeadSource}. Unknown values
 * (e.g. "contact_form") map to "website" so the insert never violates the DB
 * constraint; the original context is preserved in the notes/summary.
 */
function normalizeSource(raw: string | undefined): LeadSource {
  if (!raw) return "gift_builder";
  if (VALID_SOURCES.has(raw as LeadSource)) return raw as LeadSource;
  return "website";
}

/** Compose a human-readable notes string from contact-form context fields. */
function composeNotes(fields: {
  occasion?: string;
  teamSize?: string;
  deliveryDate?: string;
  message?: string;
}): string | undefined {
  const parts: string[] = [];
  if (fields.occasion) parts.push(`Occasion: ${fields.occasion}`);
  if (fields.teamSize) parts.push(`Team size: ${fields.teamSize}`);
  if (fields.deliveryDate) parts.push(`Delivery: ${fields.deliveryDate}`);
  if (fields.message) parts.push(`Message: ${fields.message}`);
  return parts.length > 0 ? parts.join(" | ") : undefined;
}

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  // Opportunistic cleanup to bound memory.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (rateLimited(ip)) {
      return NextResponse.json(
        { error: "rate_limited", message: "Too many submissions. Try later." },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      // Don't leak validation detail on a public endpoint.
      return NextResponse.json(
        { error: "invalid_input", message: "Invalid submission." },
        { status: 400 },
      );
    }

    const {
      name,
      email,
      phone,
      company,
      occasion,
      teamSize,
      deliveryDate,
      message,
      products,
      source,
    } = parsed.data;

    const kitSummary =
      products && products.length > 0
        ? `Kit: ${products
            .map((p) => p.name ?? p.sku)
            .slice(0, 12)
            .join(", ")}`
        : composeNotes({ occasion, teamSize, deliveryDate, message });

    await captureLead({
      name,
      email: email || undefined,
      phone,
      company,
      occasion,
      source: normalizeSource(source),
      kitSummary,
    });

    // Alert staff immediately. MUST be awaited (Vercel serverless drops
    // post-response work); wrapped so it can never fail the capture.
    try {
      await sendNewLeadAlertEmail({
        name,
        company,
        email: email || undefined,
        phone,
        message: message ?? kitSummary,
        employeeCount: teamSize,
        occasion,
        sourcePage: source ? `Enquiry (${source})` : "Gift builder",
      });
    } catch (err) {
      console.error("[LEAD_ALERT_FAILED]", err);
    }

    return NextResponse.json({ success: true });
  } catch {
    // Never block the user-facing flow on capture failure.
    return NextResponse.json({ success: true });
  }
}
