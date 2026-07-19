import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatform, apiAuthErrorResponse } from "@/lib/api-auth";
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
    const { id } = await params;
    const profile = await requirePlatform("platform.leads.manage", { entity: "lead", entityId: id, action: "lead.status" });
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "invalid_input", message: "Invalid request body." },
        { status: 400 },
      );
    }
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
    if (message.includes("loss reason is required")) {
      return NextResponse.json(
        { error: "loss_reason_required", message },
        { status: 400 },
      );
    }
    console.error("[leads/[id]/status]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not update the lead status. Please try again." },
      { status: 500 },
    );
  }
}
