import { NextResponse, type NextRequest } from "next/server";
import { recommendProducts } from "@/lib/engines/recommendation";

/** Returns recommended products for an occasion / budget. */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const occasion = searchParams.get("occasion") ?? undefined;
    const maxBudgetParam = searchParams.get("maxBudget");
    const maxBudget = maxBudgetParam ? Number(maxBudgetParam) : undefined;

    const data = recommendProducts({ occasion, maxBudget });
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[recommendations]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to load recommendations." },
      { status: 500 },
    );
  }
}
