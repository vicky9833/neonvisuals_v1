import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { brandingFromCompany } from "@/lib/engines/branding";
import { getCompanyPlanContext } from "@/lib/employees/queries";
import { isProPlan } from "@/lib/employees/plan-gate";
import { DashboardProvider } from "@/components/dashboard/DashboardProvider";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileSidebar } from "@/components/dashboard/MobileSidebar";
import { Topbar } from "@/components/dashboard/Topbar";

export const metadata = {
  robots: { index: false, follow: false },
};

/**
 * Dashboard shell. Middleware (proxy.ts) already guarantees an authenticated,
 * onboarded user - this layout fetches the profile + company once and shares
 * them with the sidebar/topbar via context.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profileWithCompany = await getProfile();
  if (!profileWithCompany) redirect("/login");

  const { company, ...profile } = profileWithCompany;
  // P9d (R1): resolve the viewer's OWN org branding from the already-loaded company row (no re-fetch).
  // Null/invalid columns → NEON fallback. Company-scoped by construction → no cross-org bleed.
  const branding = brandingFromCompany(company);

  // Real plan tier for the portal shell (sidebar label). Free unless an entitled Pro plan.
  const companyId = profile.company_id;
  const isPro = companyId ? isProPlan(await getCompanyPlanContext(companyId)) : false;

  return (
    <DashboardProvider profile={profile} company={company} branding={branding} isPro={isPro}>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <MobileSidebar />
        <div className="flex min-h-screen flex-col lg:pl-64">
          <Topbar />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </DashboardProvider>
  );
}
