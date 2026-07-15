import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import { checkDuplicates } from "@/lib/engines/memory";

export const runtime = "nodejs";

const schema = z.object({
  employeeId: z.string().uuid(),
  productSku: z.string().min(1),
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
    const result = await checkDuplicates(
      parsed.data.employeeId,
      parsed.data.productSku,
    );
    return NextResponse.json({ data: result });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[gifts/duplicates]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to check for duplicate gifts." },
      { status: 500 },
    );
  }
}
