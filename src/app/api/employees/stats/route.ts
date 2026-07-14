import { NextResponse } from "next/server";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import {
  getEmployeeCount,
  getEmployeesByDepartment,
  getUpcomingAnniversaries,
  getUpcomingBirthdays,
} from "@/lib/employees/queries";

export const runtime = "nodejs";

export async function GET() {
  try {
    const profile = await requireApiAuth();
    if (!profile.company_id) {
      return NextResponse.json({
        data: {
          total: 0,
          departments: [],
          upcomingBirthdays: [],
          upcomingAnniversaries: [],
        },
      });
    }
    const companyId = profile.company_id;
    const [total, departments, upcomingBirthdays, upcomingAnniversaries] =
      await Promise.all([
        getEmployeeCount(companyId),
        getEmployeesByDepartment(companyId),
        getUpcomingBirthdays(companyId, 30),
        getUpcomingAnniversaries(companyId, 30),
      ]);
    return NextResponse.json({
      data: { total, departments, upcomingBirthdays, upcomingAnniversaries },
    });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[employees/stats]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to load employee stats." },
      { status: 500 },
    );
  }
}
