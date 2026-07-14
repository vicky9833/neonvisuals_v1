import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import { getRecommendations } from "@/lib/engines/recommendation";

export const runtime = "nodejs";

const schema = z.object({
  employeeId: z.string().uuid(),
  occasion: z.string().min(1),
  budget: z.enum(["low", "medium", "high", "premium"]).optional(),
  count: z.number().int().positive().max(24).optional(),
});

export async function POST(request: Request) {
  try {
    await requireApiAuth();
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "invalid_input", message: "Invalid JSON body." },
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
    const recommendations = await getRecommendations(parsed.data);
    return NextResponse.json({ data: recommendations });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[gifts/recommendations]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to generate recommendations." },
      { status: 500 },
    );
  }
}
