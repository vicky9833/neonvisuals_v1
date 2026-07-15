import { NextResponse } from "next/server";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";
import { getPipelineData } from "@/lib/engines/lead";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireApiRole(["super_admin"]);
    const data = await getPipelineData();
    return NextResponse.json({ data });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[leads/pipeline]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not load the pipeline. Please try again." },
      { status: 500 },
    );
  }
}
