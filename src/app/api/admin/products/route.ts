import { NextResponse } from "next/server";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";
import { listAdminProducts } from "@/lib/admin/products";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireApiRole(["super_admin"]);
    const products = await listAdminProducts();
    return NextResponse.json({ data: products });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[admin/products]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to load products." },
      { status: 500 },
    );
  }
}
