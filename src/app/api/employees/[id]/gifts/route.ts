import { NextResponse } from "next/server";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import { getEmployeeGiftStats } from "@/lib/engines/memory";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    await requireApiAuth();
    const { id } = await params;
    const stats = await getEmployeeGiftStats(id);
    return NextResponse.json({ data: stats });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[employees/[id]/gifts]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to load employee gift stats." },
      { status: 500 },
    );
  }
}
