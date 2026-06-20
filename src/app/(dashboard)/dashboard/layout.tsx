import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { DashboardProvider } from "@/components/dashboard/DashboardProvider";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileSidebar } from "@/components/dashboard/MobileSidebar";
import { Topbar } from "@/components/dashboard/Topbar";

export const metadata = {
  robots: { index: false, follow: false },
};

/**
 * Dashboard shell. Middleware (proxy.ts) already guarantees an authenticated,
 * onboarded user — this layout fetches the profile + company once and shares
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

  return (
    <DashboardProvider profile={profile} company={company}>
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
