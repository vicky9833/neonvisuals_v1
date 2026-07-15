import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { getAuthContext } from "@/lib/authz/context";
import { AdminProvider } from "@/components/admin/AdminProvider";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminMobileSidebar } from "@/components/admin/AdminMobileSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";

export const metadata = {
  robots: { index: false, follow: false },
};

/**
 * Ops (platform) shell at /ops/*. The proxy already default-denies /ops to
 * non-platform-staff; this layout re-checks platform staff via getAuthContext()
 * (defense-in-depth, two-plane model — no profiles.role read) and shares the
 * profile with the sidebar/topbar via context. Chrome only.
 */
export default async function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!ctx.isPlatformStaff) redirect("/dashboard");

  const profileWithCompany = await getProfile();
  if (!profileWithCompany) redirect("/login");
  const { company: _company, ...profile } = profileWithCompany;

  return (
    <AdminProvider profile={profile}>
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        <AdminMobileSidebar />
        <div className="flex min-h-screen flex-col lg:pl-64">
          <AdminTopbar />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </AdminProvider>
  );
}
