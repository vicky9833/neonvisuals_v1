import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";
import { convertLeadToClient } from "@/lib/engines/lead";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().optional(),
  industry: z.string().optional(),
  employeeCount: z.string().optional(),
  city: z.string().optional(),
  website: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireApiRole(["super_admin"]);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body ?? {});
    const result = await convertLeadToClient(
      id,
      parsed.success ? parsed.data : undefined,
      profile.id,
    );
    return NextResponse.json({ data: result });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[leads/[id]/convert]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not convert the lead. Please try again." },
      { status: 500 },
    );
  }
}
