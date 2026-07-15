import { NextResponse } from "next/server";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";
import { getAnalytics, type AnalyticsSection } from "@/lib/engines/analytics";

export const runtime = "nodejs";

const VALID: AnalyticsSection[] = [
  "revenue",
  "sales",
  "clients",
  "products",
  "gifts",
  "content",
  "financial",
  "all",
];

function defaultRange() {
  const now = new Date();
  return {
    start: `${now.getFullYear()}-01-01`,
    end: now.toISOString().slice(0, 10),
  };
}

export async function GET(request: Request) {
  try {
    await requireApiRole(["super_admin"]);
    const { searchParams } = new URL(request.url);
    const fallback = defaultRange();
    const range = {
      start: searchParams.get("start") ?? fallback.start,
      end: searchParams.get("end") ?? fallback.end,
    };
    const sectionParam = searchParams.get("section") ?? "all";
    const section = (VALID.includes(sectionParam as AnalyticsSection)
      ? sectionParam
      : "all") as AnalyticsSection;

    const data = await getAnalytics(range, section);
    return NextResponse.json({ data });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[admin/analytics]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to load analytics." },
      { status: 500 },
    );
  }
}
