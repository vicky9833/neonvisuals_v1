import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";
import { getLead, updateLead, updateLeadStatus } from "@/lib/engines/lead";

export const runtime = "nodejs";

const updateSchema = z.object({
  contactName: z.string().min(1).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  contactDesignation: z.string().optional(),
  companyName: z.string().min(1).optional(),
  companyIndustry: z.string().optional(),
  companySize: z.string().optional(),
  companyCity: z.string().optional(),
  companyWebsite: z.string().optional(),
  priority: z.enum(["hot", "warm", "medium", "cold"]).optional(),
  source: z
    .enum([
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
    ])
    .optional(),
  sourceDetail: z.string().optional(),
  estimatedOrderValue: z.number().nonnegative().optional(),
  estimatedKitCount: z.number().int().nonnegative().optional(),
  interestedCollections: z.array(z.string()).optional(),
  interestedOccasions: z.array(z.string()).optional(),
  assignedTo: z.string().uuid().optional(),
  nextFollowUpDate: z.string().optional(),
  nextFollowUpNote: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireApiRole(["super_admin"]);
    const { id } = await params;
    const lead = await getLead(id);
    if (!lead) {
      return NextResponse.json(
        { error: "not_found", message: "Lead not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: lead });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "get_failed", message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireApiRole(["super_admin"]);
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    const lead = await updateLead(id, {
      ...parsed.data,
      contactEmail:
        parsed.data.contactEmail === "" ? undefined : parsed.data.contactEmail,
    });
    return NextResponse.json({ data: lead });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "update_failed", message }, { status: 500 });
  }
}

// Soft delete — mark as lost with reason 'deleted'.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireApiRole(["super_admin"]);
    const { id } = await params;
    await updateLeadStatus(id, "lost", "Lead deleted", profile.id, "other");
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "delete_failed", message }, { status: 500 });
  }
}
