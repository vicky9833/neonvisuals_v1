import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";
import { getLead, updateLeadStatus, type LeadStatus } from "@/lib/engines/lead";

export const runtime = "nodejs";

const schema = z.object({
  status: z.enum([
    "new",
    "contacted",
    "qualified",
    "proposal_sent",
    "negotiation",
    "won",
    "lost",
    "dormant",
  ]),
  notes: z.string().optional(),
  lossReason: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireApiRole(["super_admin"]);
    const { id } = await params;
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    await updateLeadStatus(
      id,
      parsed.data.status as LeadStatus,
      parsed.data.notes,
      profile.id,
      parsed.data.lossReason,
    );
    const lead = await getLead(id);
    return NextResponse.json({ data: lead });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    const isClientError = message.includes("loss reason is required");
    return NextResponse.json(
      { error: isClientError ? "loss_reason_required" : "status_failed", message },
      { status: isClientError ? 400 : 500 },
    );
  }
}
